import React, { useState, useEffect } from 'react';
import { Patient, SurgeryGroup, INITIAL_AUDIOMETRY, INITIAL_OTOSCOPY, calculateAverage, calculateABG, AudiometryResult, Frequencies } from '../types';
import { Save, UserPlus, Stethoscope, Ear, Activity, Loader2, ExternalLink, Calendar, Clock, Eye, X } from 'lucide-react';
import AudiogramUploader from './AudiogramUploader';

interface PatientFormProps {
  onSave: (patient: Patient) => Promise<void>;
  initialData?: Patient | null;
}

const emptyPatient: Patient = {
  id: '',
  name: '',
  age: 0,
  sex: 'Male',
  address: '',
  religion: '',
  education: '',
  bmi: 0,
  operatedEar: 'Right',
  group: SurgeryGroup.TFG,
  diagnosis: '',
  preOpOtoscopy: { right: { ...INITIAL_OTOSCOPY }, left: { ...INITIAL_OTOSCOPY } },
  preOpAudiometry: { ...INITIAL_AUDIOMETRY },
  postOp6WeeksOtoscopy: { right: { ...INITIAL_OTOSCOPY }, left: { ...INITIAL_OTOSCOPY } },
  postOp6WeeksAudiometry: { ...INITIAL_AUDIOMETRY },
  postOp12WeeksOtoscopy: { right: { ...INITIAL_OTOSCOPY }, left: { ...INITIAL_OTOSCOPY } },
  postOp12WeeksAudiometry: { ...INITIAL_AUDIOMETRY },
};

// UI Classes
const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all placeholder:text-gray-400 hover:border-gray-400 shadow-sm";
const selectClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all hover:border-gray-400 shadow-sm cursor-pointer";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";
const sectionHeaderClass = "text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-6";

const PatientForm: React.FC<PatientFormProps> = ({ onSave, initialData }) => {
  const [patient, setPatient] = useState<Patient>({ ...emptyPatient, id: crypto.randomUUID() });
  const [activeTab, setActiveTab] = useState<'demographics' | 'preop' | 'postop6' | 'postop12'>('demographics');
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
        setPatient(initialData);
    } else {
        // Reset if no initialData (e.g. switching from Edit back to New)
        setPatient({ ...emptyPatient, id: crypto.randomUUID() });
    }
  }, [initialData]);

  const handleChange = (field: keyof Patient, value: any) => {
    setPatient(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (path: string[], value: any) => {
    setPatient(prev => {
      const deepClone = JSON.parse(JSON.stringify(prev));
      let current = deepClone;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return deepClone;
    });
  };

  const updateAudiometry = (phase: 'preOpAudiometry' | 'postOp6WeeksAudiometry' | 'postOp12WeeksAudiometry', side: 'right' | 'left', type: 'airConduction' | 'boneConduction', freq: keyof Frequencies, value: number) => {
    setPatient(prev => {
      const newState = { ...prev };
      const audiometry = newState[phase];
      const ear = audiometry[side];
      ear[type][freq] = value;
      
      ear[type].avg = calculateAverage(ear[type]);
      
      if (ear.airConduction.avg !== undefined && ear.boneConduction.avg !== undefined) {
         ear.airBoneGap = calculateABG(ear.airConduction.avg, ear.boneConduction.avg);
      }
      
      return newState;
    });
  };

  const handleAIUpload = (phase: 'preOpAudiometry' | 'postOp6WeeksAudiometry' | 'postOp12WeeksAudiometry', data: AudiometryResult) => {
    const processEar = (ear: any) => {
        ear.airConduction.avg = calculateAverage(ear.airConduction);
        ear.boneConduction.avg = calculateAverage(ear.boneConduction);
        ear.airBoneGap = calculateABG(ear.airConduction.avg, ear.boneConduction.avg);
        return ear;
    };

    const processedData = {
        right: processEar(data.right),
        left: processEar(data.left),
        imageUrl: data.imageUrl // Persist the URL
    };

    setPatient(prev => ({
        ...prev,
        [phase]: processedData
    }));
  };

  // Logic to calculate follow-up date and status
  const getFollowUpStatus = (weeks: number) => {
    if (!patient.operationDate) return null;
    
    const opDate = new Date(patient.operationDate);
    const targetDate = new Date(opDate);
    targetDate.setDate(opDate.getDate() + (weeks * 7));

    const today = new Date();
    // Normalize to midnight to avoid time issues
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffTime = targetMidnight.getTime() - todayMidnight.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        dateString: targetDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
        daysLeft: diffDays
    };
  };

  const renderFollowUpBanner = (weeks: number) => {
      const status = getFollowUpStatus(weeks);
      if (!status) return (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 flex items-center gap-3">
            <Clock size={20} />
            <span>Please enter <strong>Operation Date</strong> in Demographics to see follow-up schedule.</span>
        </div>
      );

      let colorClass = "bg-blue-50 border-blue-200 text-blue-800";
      let statusText = `${status.daysLeft} days remaining`;
      
      if (status.daysLeft < 0) {
          colorClass = "bg-red-50 border-red-200 text-red-800";
          statusText = `Overdue by ${Math.abs(status.daysLeft)} days`;
      } else if (status.daysLeft === 0) {
          colorClass = "bg-green-50 border-green-200 text-green-800";
          statusText = "Due Today!";
      }

      return (
          <div className={`${colorClass} border p-4 rounded-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
             <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-lg bg-opacity-50">
                    <Calendar size={24} />
                 </div>
                 <div>
                     <h4 className="font-bold text-sm uppercase tracking-wide opacity-80">{weeks} Week Follow-up Date</h4>
                     <p className="text-lg font-bold">{status.dateString}</p>
                 </div>
             </div>
             <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-lg font-semibold">
                <Clock size={18} />
                <span>{statusText}</span>
             </div>
          </div>
      );
  };

  const renderAudiometryInputs = (phase: 'preOpAudiometry' | 'postOp6WeeksAudiometry' | 'postOp12WeeksAudiometry', side: 'right' | 'left', label: string) => {
    const data = patient[phase][side];
    const gridInputClass = "w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-center shadow-sm hover:border-teal-400";
    const headerGridClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider text-center";
    
    return (
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <h4 className="font-semibold text-gray-800 mb-4 text-sm flex justify-between items-center border-b border-gray-100 pb-2">
            <span>{label} <span className="text-gray-400 font-normal ml-1">({side === 'right' ? 'Red' : 'Blue'})</span></span>
            <span className={`w-2.5 h-2.5 rounded-full ${side === 'right' ? 'bg-red-500' : 'bg-blue-500'} shadow-sm`}></span>
        </h4>
        
        <div className="grid grid-cols-5 gap-3 mb-3 items-center">
            <span className="text-xs font-bold text-gray-400">Hz</span>
            <span className={headerGridClass}>500</span>
            <span className={headerGridClass}>1k</span>
            <span className={headerGridClass}>2k</span>
            <span className={headerGridClass}>4k</span>
        </div>

        {/* Air Conduction */}
        <div className="grid grid-cols-5 gap-3 mb-3 items-center">
             <span className="text-xs font-bold text-gray-700">Air</span>
             {(['f500', 'f1k', 'f2k', 'f4k'] as const).map(f => (
                 <input 
                    key={`ac-${f}`}
                    type="number" 
                    className={gridInputClass}
                    value={data.airConduction[f]}
                    onChange={(e) => updateAudiometry(phase, side, 'airConduction', f, Number(e.target.value))}
                 />
             ))}
        </div>

        {/* Bone Conduction */}
        <div className="grid grid-cols-5 gap-3 mb-3 items-center">
             <span className="text-xs font-bold text-gray-700">Bone</span>
             {(['f500', 'f1k', 'f2k', 'f4k'] as const).map(f => (
                 <input 
                    key={`bc-${f}`}
                    type="number" 
                    className={gridInputClass}
                    value={data.boneConduction[f]}
                    onChange={(e) => updateAudiometry(phase, side, 'boneConduction', f, Number(e.target.value))}
                 />
             ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 bg-gray-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
             <div className="flex flex-col">
                <span className="text-[10px] uppercase text-gray-500 font-bold">Avg AC</span>
                <span className="font-mono font-medium text-gray-800">{data.airConduction.avg?.toFixed(1) || '0.0'}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] uppercase text-gray-500 font-bold">Avg BC</span>
                <span className="font-mono font-medium text-gray-800">{data.boneConduction.avg?.toFixed(1) || '0.0'}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] uppercase text-teal-600 font-bold">AB Gap</span>
                <span className="font-mono font-bold text-teal-700">{data.airBoneGap?.toFixed(1) || '0.0'}</span>
             </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await onSave(patient);
        setPatient({ ...emptyPatient, id: crypto.randomUUID() });
        // Alert handled by parent to coordinate with navigation
    } catch (e) {
        console.error(e);
        alert("Failed to save data. Check console.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={() => setPreviewImage(null)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                >
                    <X size={32} />
                </button>
                <img src={previewImage} alt="Audiogram Preview" className="w-full h-full object-contain rounded-lg shadow-2xl bg-white" />
            </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 flex space-x-1 overflow-x-auto sticky top-0 z-10 backdrop-blur-md bg-white/80">
        {[
          { id: 'demographics', icon: UserPlus, label: 'Demographics' },
          { id: 'preop', icon: Stethoscope, label: 'Pre-Op' },
          { id: 'postop6', icon: Ear, label: '6 Weeks' },
          { id: 'postop12', icon: Activity, label: '12 Weeks' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap outline-none focus:ring-2 focus:ring-teal-500/20 ${
              activeTab === tab.id 
                ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
        {activeTab === 'demographics' && (
          <div className="animate-fade-in">
            <h3 className={sectionHeaderClass}>Patient Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="md:col-span-2">
                 <label className={labelClass}>Full Name</label>
                 <input required type="text" placeholder="e.g. John Doe" className={inputClass} value={patient.name} onChange={e => handleChange('name', e.target.value)} />
              </div>
              <div>
                 <label className={labelClass}>Age</label>
                 <input required type="number" placeholder="Years" className={inputClass} value={patient.age || ''} onChange={e => handleChange('age', Number(e.target.value))} />
              </div>
              <div>
                 <label className={labelClass}>Sex</label>
                 <select className={selectClass} value={patient.sex} onChange={e => handleChange('sex', e.target.value)}>
                   <option>Male</option>
                   <option>Female</option>
                   <option>Other</option>
                 </select>
              </div>
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <div className="grid md:grid-cols-2 gap-4">
                     <div>
                        <label className={labelClass}>Study Group</label>
                        <select className={selectClass} value={patient.group} onChange={e => handleChange('group', e.target.value)}>
                            <option value={SurgeryGroup.TFG}>Tympanomeatal Flap Elevation (TFG)</option>
                            <option value={SurgeryGroup.NTFG}>Non-Elevation (NTFG)</option>
                        </select>
                     </div>
                     <div>
                        <label className={labelClass}>Operated Ear</label>
                        <select className={selectClass} value={patient.operatedEar} onChange={e => handleChange('operatedEar', e.target.value)}>
                            <option value="Right">Right Ear</option>
                            <option value="Left">Left Ear</option>
                        </select>
                     </div>
                 </div>
                 <p className="text-xs text-gray-500 mt-2">Ensure randomization and side protocol is followed.</p>
              </div>
              <div className="md:col-span-2">
                  <label className={labelClass}>Operation Date</label>
                  <input 
                    type="date" 
                    className={inputClass} 
                    value={patient.operationDate || ''} 
                    onChange={e => handleChange('operationDate', e.target.value)} 
                  />
                  <p className="text-xs text-gray-500 mt-1">Required for calculating follow-up schedule.</p>
              </div>
              <div>
                  <label className={labelClass}>Diagnosis</label>
                  <input type="text" placeholder="Clinical diagnosis" className={inputClass} value={patient.diagnosis} onChange={e => handleChange('diagnosis', e.target.value)} />
              </div>
              <div>
                  <label className={labelClass}>BMI</label>
                  <input type="number" placeholder="kg/m²" className={inputClass} value={patient.bmi || ''} onChange={e => handleChange('bmi', Number(e.target.value))} />
              </div>
              <div>
                  <label className={labelClass}>Address</label>
                  <input type="text" className={inputClass} value={patient.address} onChange={e => handleChange('address', e.target.value)} />
              </div>
              <div>
                  <label className={labelClass}>Education</label>
                  <input type="text" className={inputClass} value={patient.education} onChange={e => handleChange('education', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Pre Op Tab */}
        {activeTab === 'preop' && (
          <div className="space-y-8 animate-fade-in">
            <div>
                <h3 className={sectionHeaderClass}>Pre-operative Otoscopy</h3>
                <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Right Ear
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Perforation Size</label>
                            <input placeholder="e.g. Small, Subtotal" className={inputClass} value={patient.preOpOtoscopy.right.perforationSize} onChange={e => handleNestedChange(['preOpOtoscopy', 'right', 'perforationSize'], e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>Quadrant</label>
                            <input placeholder="e.g. Antero-inferior" className={inputClass} value={patient.preOpOtoscopy.right.quadrant} onChange={e => handleNestedChange(['preOpOtoscopy', 'right', 'quadrant'], e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Left Ear
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Perforation Size</label>
                            <input placeholder="e.g. Small, Subtotal" className={inputClass} value={patient.preOpOtoscopy.left.perforationSize} onChange={e => handleNestedChange(['preOpOtoscopy', 'left', 'perforationSize'], e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>Quadrant</label>
                            <input placeholder="e.g. Antero-inferior" className={inputClass} value={patient.preOpOtoscopy.left.quadrant} onChange={e => handleNestedChange(['preOpOtoscopy', 'left', 'quadrant'], e.target.value)} />
                        </div>
                    </div>
                </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Pre-operative Audiometry</h3>
                        {patient.preOpAudiometry.imageUrl && (
                            <button 
                                type="button" 
                                onClick={() => setPreviewImage(patient.preOpAudiometry.imageUrl!)} 
                                className="flex items-center text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline mt-2 bg-teal-50 px-2 py-1 rounded"
                            >
                                <Eye size={14} className="mr-1.5"/> View Source Image
                            </button>
                        )}
                    </div>
                    <div className="w-full md:w-72">
                        <AudiogramUploader 
                            onDataExtracted={(data) => handleAIUpload('preOpAudiometry', data)} 
                            currentImageUrl={patient.preOpAudiometry.imageUrl}
                        />
                    </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                    {renderAudiometryInputs('preOpAudiometry', 'right', 'Right Ear PTA')}
                    {renderAudiometryInputs('preOpAudiometry', 'left', 'Left Ear PTA')}
                </div>
            </div>
          </div>
        )}

        {/* Post Op 6 Weeks */}
        {activeTab === 'postop6' && (
          <div className="space-y-8 animate-fade-in">
             {renderFollowUpBanner(6)}
             
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Post-Op Assessment (6 Weeks)</h3>
                    {patient.postOp6WeeksAudiometry.imageUrl && (
                         <button 
                            type="button" 
                            onClick={() => setPreviewImage(patient.postOp6WeeksAudiometry.imageUrl!)} 
                            className="flex items-center text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline mt-2 bg-teal-50 px-2 py-1 rounded"
                        >
                            <Eye size={14} className="mr-1.5"/> View Source Image
                        </button>
                    )}
                </div>
                <div className="w-full md:w-72">
                    <AudiogramUploader 
                        onDataExtracted={(data) => handleAIUpload('postOp6WeeksAudiometry', data)}
                        currentImageUrl={patient.postOp6WeeksAudiometry.imageUrl}
                    />
                </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-8">
                 {/* Only show Right Graft Status if operated on Right */}
                 {patient.operatedEar === 'Right' && (
                     <div className="bg-teal-50/50 p-6 rounded-xl border border-teal-100 shadow-sm ring-1 ring-teal-200">
                        <h4 className="text-sm font-bold text-teal-800 uppercase mb-4 flex items-center justify-between">
                            <span>Right Ear Outcome (Operated)</span>
                            <span className="text-[10px] bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full">Target</span>
                        </h4>
                        <label className={labelClass}>Graft Status</label>
                        <select className={selectClass} value={patient.postOp6WeeksOtoscopy.right.graftUptake || ''} onChange={e => handleNestedChange(['postOp6WeeksOtoscopy', 'right', 'graftUptake'], e.target.value)}>
                            <option value="">Select status...</option>
                            <option value="Uptake">Uptake (Successful)</option>
                            <option value="Fail">Fail (Perforation Persists)</option>
                        </select>
                     </div>
                 )}
                 {/* Only show Left Graft Status if operated on Left */}
                 {patient.operatedEar === 'Left' && (
                     <div className="bg-teal-50/50 p-6 rounded-xl border border-teal-100 shadow-sm ring-1 ring-teal-200">
                        <h4 className="text-sm font-bold text-teal-800 uppercase mb-4 flex items-center justify-between">
                            <span>Left Ear Outcome (Operated)</span>
                            <span className="text-[10px] bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full">Target</span>
                        </h4>
                        <label className={labelClass}>Graft Status</label>
                        <select className={selectClass} value={patient.postOp6WeeksOtoscopy.left.graftUptake || ''} onChange={e => handleNestedChange(['postOp6WeeksOtoscopy', 'left', 'graftUptake'], e.target.value)}>
                            <option value="">Select status...</option>
                            <option value="Uptake">Uptake (Successful)</option>
                            <option value="Fail">Fail (Perforation Persists)</option>
                        </select>
                     </div>
                 )}
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                {renderAudiometryInputs('postOp6WeeksAudiometry', 'right', 'Right Ear PTA')}
                {renderAudiometryInputs('postOp6WeeksAudiometry', 'left', 'Left Ear PTA')}
            </div>
          </div>
        )}

        {/* Post Op 12 Weeks */}
        {activeTab === 'postop12' && (
          <div className="space-y-8 animate-fade-in">
             {renderFollowUpBanner(12)}

             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Post-Op Assessment (12 Weeks)</h3>
                    {patient.postOp12WeeksAudiometry.imageUrl && (
                        <button 
                            type="button" 
                            onClick={() => setPreviewImage(patient.postOp12WeeksAudiometry.imageUrl!)} 
                            className="flex items-center text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline mt-2 bg-teal-50 px-2 py-1 rounded"
                        >
                            <Eye size={14} className="mr-1.5"/> View Source Image
                        </button>
                    )}
                </div>
                <div className="w-full md:w-72">
                    <AudiogramUploader 
                        onDataExtracted={(data) => handleAIUpload('postOp12WeeksAudiometry', data)}
                        currentImageUrl={patient.postOp12WeeksAudiometry.imageUrl}
                    />
                </div>
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                 {/* Only show Right Graft Status if operated on Right */}
                 {patient.operatedEar === 'Right' && (
                     <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 shadow-sm ring-1 ring-indigo-200">
                        <h4 className="text-sm font-bold text-indigo-800 uppercase mb-4 flex items-center justify-between">
                            <span>Right Ear Outcome (Operated)</span>
                            <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Target</span>
                        </h4>
                        <label className={labelClass}>Graft Status</label>
                        <select className={selectClass} value={patient.postOp12WeeksOtoscopy.right.graftUptake || ''} onChange={e => handleNestedChange(['postOp12WeeksOtoscopy', 'right', 'graftUptake'], e.target.value)}>
                            <option value="">Select status...</option>
                            <option value="Uptake">Uptake (Successful)</option>
                            <option value="Fail">Fail (Perforation Persists)</option>
                        </select>
                     </div>
                 )}
                 {/* Only show Left Graft Status if operated on Left */}
                 {patient.operatedEar === 'Left' && (
                     <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 shadow-sm ring-1 ring-indigo-200">
                        <h4 className="text-sm font-bold text-indigo-800 uppercase mb-4 flex items-center justify-between">
                            <span>Left Ear Outcome (Operated)</span>
                            <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Target</span>
                        </h4>
                        <label className={labelClass}>Graft Status</label>
                        <select className={selectClass} value={patient.postOp12WeeksOtoscopy.left.graftUptake || ''} onChange={e => handleNestedChange(['postOp12WeeksOtoscopy', 'left', 'graftUptake'], e.target.value)}>
                            <option value="">Select status...</option>
                            <option value="Uptake">Uptake (Successful)</option>
                            <option value="Fail">Fail (Perforation Persists)</option>
                        </select>
                     </div>
                 )}
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                {renderAudiometryInputs('postOp12WeeksAudiometry', 'right', 'Right Ear PTA')}
                {renderAudiometryInputs('postOp12WeeksAudiometry', 'left', 'Left Ear PTA')}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end sticky bottom-6 z-20">
        <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center space-x-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-70 disabled:active:scale-100"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          <span className="font-semibold">{isSaving ? 'Saving...' : initialData ? 'Save Changes' : 'Save Patient Record'}</span>
        </button>
      </div>
    </form>
  );
};

export default PatientForm;
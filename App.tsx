import React, { useState, useEffect } from 'react';
import { Patient, SurgeryGroup, EarData } from './types';
import PatientForm from './components/PatientForm';
import Dashboard from './components/Dashboard';
import GroupedPatients from './components/GroupedPatients';
import LiteratureSearch from './components/LiteratureSearch';
import FakeDataGenerator from './components/FakeDataGenerator';
import { Logo } from './components/Logo';
import { generateThesisAnalysis } from './services/gemini';
import { LayoutDashboard, Database, BrainCircuit, Search, Wand2, Sparkles, ChevronRight, Loader2, CloudOff, Trash2, Edit, FileSpreadsheet, Printer, Users, AlertTriangle, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from './lib/supabaseClient';
import remarkGfm from 'remark-gfm';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [view, setView] = useState<'dashboard' | 'groups' | 'entry' | 'analysis' | 'search' | 'generator'>('dashboard');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Delete Modal State
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoadingPatients(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Map DB snake_case to TS camelCase
        const mappedPatients: Patient[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          age: d.age,
          sex: d.sex,
          address: d.address,
          religion: d.religion,
          education: d.education,
          bmi: d.bmi,
          operationDate: d.operation_date,
          operatedEar: d.operated_ear || 'Right', // Default for legacy data
          group: d.study_group === 'Tympanomeatal Flap Elevation' ? SurgeryGroup.TFG : SurgeryGroup.NTFG,
          diagnosis: d.diagnosis,
          preOpOtoscopy: d.pre_op_otoscopy,
          preOpAudiometry: d.pre_op_audiometry,
          postOp6WeeksOtoscopy: d.post_op_6_weeks_otoscopy,
          postOp6WeeksAudiometry: d.post_op_6_weeks_audiometry,
          postOp12WeeksOtoscopy: d.post_op_12_weeks_otoscopy,
          postOp12WeeksAudiometry: d.post_op_12_weeks_audiometry,
        }));
        setPatients(mappedPatients);
      }
    } catch (err: any) {
      console.error("Error fetching patients:", err);
      // Fallback or specific error handling
      if (err.message && err.message.includes("relation \"public.patients\" does not exist")) {
         setDbError("Database table 'patients' not found. Please create the tables using the SQL provided in supabaseClient.ts");
      } else {
         setDbError("Failed to load patient data from cloud.");
      }
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleSavePatient = async (patientData: Patient) => {
    try {
      // Map TS camelCase to DB snake_case
      const dbPayload = {
        name: patientData.name,
        age: patientData.age,
        sex: patientData.sex,
        address: patientData.address,
        religion: patientData.religion,
        education: patientData.education,
        bmi: patientData.bmi,
        operation_date: patientData.operationDate,
        operated_ear: patientData.operatedEar,
        study_group: patientData.group, // Map key
        diagnosis: patientData.diagnosis,
        pre_op_otoscopy: patientData.preOpOtoscopy,
        pre_op_audiometry: patientData.preOpAudiometry,
        post_op_6_weeks_otoscopy: patientData.postOp6WeeksOtoscopy,
        post_op_6_weeks_audiometry: patientData.postOp6WeeksAudiometry,
        post_op_12_weeks_otoscopy: patientData.postOp12WeeksOtoscopy,
        post_op_12_weeks_audiometry: patientData.postOp12WeeksAudiometry
      };

      if (editingPatient) {
        // UPDATE existing patient
        const { error } = await supabase
          .from('patients')
          .update(dbPayload)
          .eq('id', patientData.id);
        
        if (error) throw error;
        alert("Patient updated successfully.");
      } else {
        // INSERT new patient
        const { error } = await supabase.from('patients').insert({
          ...dbPayload,
          id: patientData.id, 
        });
        if (error) throw error;
        alert("New patient added successfully.");
      }

      // Reload list and reset state
      await fetchPatients();
      setEditingPatient(null);
      setView('dashboard');
    } catch (err) {
      console.error("Error saving patient:", err);
      throw err; // Propagate to form for alert
    }
  };

  const handleSaveBatch = async (batch: Patient[]) => {
      try {
          const payloads = batch.map(p => ({
            id: p.id, // Use generated UUID
            name: p.name,
            age: p.age,
            sex: p.sex,
            address: p.address,
            religion: p.religion,
            education: p.education,
            bmi: p.bmi,
            operation_date: p.operationDate,
            operated_ear: p.operatedEar,
            study_group: p.group,
            diagnosis: p.diagnosis,
            pre_op_otoscopy: p.preOpOtoscopy,
            pre_op_audiometry: p.preOpAudiometry,
            post_op_6_weeks_otoscopy: p.postOp6WeeksOtoscopy,
            post_op_6_weeks_audiometry: p.postOp6WeeksAudiometry,
            post_op_12_weeks_otoscopy: p.postOp12WeeksOtoscopy,
            post_op_12_weeks_audiometry: p.postOp12WeeksAudiometry
          }));

          const { error } = await supabase.from('patients').insert(payloads);
          if (error) throw error;

          alert(`${batch.length} patients generated and saved successfully!`);
          await fetchPatients();
          setView('dashboard');
      } catch (err) {
          console.error("Batch save error:", err);
          alert("Failed to save batch data.");
      }
  };

  // 1. Trigger the Modal
  const initiateDelete = (id: string) => {
    if (id) {
        setPendingDeleteId(id);
    }
  };

  // 2. Execute Delete (Called from Modal)
  const executeDelete = async () => {
    if (!pendingDeleteId) return;
    
    setIsDeleting(true);

    try {
      const { error, count } = await supabase
        .from('patients')
        .delete({ count: 'exact' })
        .eq('id', pendingDeleteId);

      if (error) throw error;
      
      // Update local state immediately
      setPatients(prev => prev.filter(p => p.id !== pendingDeleteId));
      setPendingDeleteId(null);
      
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert(`Failed to delete patient. Error: ${err.message || err.toString()}`);
      fetchPatients();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (patient: Patient) => {
    setEditingPatient(patient);
    setView('entry');
  };

  // Professional Excel Export
  const handleExportExcel = () => {
    if (patients.length === 0) {
      alert("No data to export.");
      return;
    }

    // 1. Flatten Data for Sheet 1
    const flatData = patients.map(p => {
        // Helpers
        const opEar = p.operatedEar;
        const preABG = opEar === 'Right' ? p.preOpAudiometry.right.airBoneGap : p.preOpAudiometry.left.airBoneGap;
        const post12ABG = opEar === 'Right' ? p.postOp12WeeksAudiometry.right.airBoneGap : p.postOp12WeeksAudiometry.left.airBoneGap;
        const graft = opEar === 'Right' ? p.postOp12WeeksOtoscopy.right.graftUptake : p.postOp12WeeksOtoscopy.left.graftUptake;

        return {
            "ID": p.id,
            "Name": p.name,
            "Age": p.age,
            "Sex": p.sex,
            "Group": p.group === SurgeryGroup.TFG ? 'TFG' : 'NTFG',
            "Operated Ear": p.operatedEar,
            "Op Date": p.operationDate,
            "Diagnosis": p.diagnosis,
            "Pre-Op ABG": preABG?.toFixed(1) || '',
            "Post-Op 12w ABG": post12ABG?.toFixed(1) || '',
            "ABG Improvement": ((preABG || 0) - (post12ABG || 0)).toFixed(1),
            "Graft Outcome (12w)": graft || 'Pending',
            // Detailed breakdown could be added here if needed
        };
    });

    // 2. Calculate Summary Stats for Sheet 2
    const tfgPatients = patients.filter(p => p.group === SurgeryGroup.TFG);
    const ntfgPatients = patients.filter(p => p.group === SurgeryGroup.NTFG);

    const calcSuccess = (groupP: Patient[]) => groupP.filter(p => {
        const ear = p.operatedEar;
        const res = ear === 'Right' ? p.postOp12WeeksOtoscopy.right.graftUptake : p.postOp12WeeksOtoscopy.left.graftUptake;
        return res === 'Uptake';
    }).length;

    const tfgSuccess = calcSuccess(tfgPatients);
    const ntfgSuccess = calcSuccess(ntfgPatients);

    const summaryData = [
        { Metric: "Total Patients", TFG: tfgPatients.length, NTFG: ntfgPatients.length },
        { Metric: "Graft Success (n)", TFG: tfgSuccess, NTFG: ntfgSuccess },
        { Metric: "Success Rate (%)", TFG: `${((tfgSuccess/tfgPatients.length || 0)*100).toFixed(1)}%`, NTFG: `${((ntfgSuccess/ntfgPatients.length || 0)*100).toFixed(1)}%` },
    ];

    // 3. Create Workbook and Sheets
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Master Data
    const ws1 = XLSX.utils.json_to_sheet(flatData);
    // Auto-width columns roughly
    const wscols1 = Object.keys(flatData[0]).map(k => ({ wch: k.length + 5 })); 
    ws1['!cols'] = wscols1;
    XLSX.utils.book_append_sheet(wb, ws1, "Clinical Data");

    // Sheet 2: Analysis Summary
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    const wscols2 = [{ wch: 20 }, { wch: 10 }, { wch: 10 }];
    ws2['!cols'] = wscols2;
    XLSX.utils.book_append_sheet(wb, ws2, "Study Analysis");

    // 4. Download
    XLSX.writeFile(wb, `Myringoplasty_Study_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleMenuClick = (viewId: typeof view) => {
    if (viewId !== 'entry') {
      setEditingPatient(null);
    } else if (viewId === 'entry' && view !== 'entry') {
      setEditingPatient(null);
    }
    setView(viewId);
    setMobileMenuOpen(false);
  };

  const runDeepAnalysis = async () => {
    if (patients.length < 2) {
      alert("Need at least 2 patients to run statistical analysis.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await generateThesisAnalysis(patients);
      setAnalysisResult(result);
    } catch (e) {
      alert("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'groups', icon: Users, label: 'Patient Cohorts' },
    { id: 'entry', icon: Database, label: 'Data Entry' },
    { id: 'analysis', icon: BrainCircuit, label: 'AI Thesis Analysis' },
    { id: 'search', icon: Search, label: 'Literature Search' },
    { id: 'generator', icon: Wand2, label: 'Fake Data Generator' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans print:bg-white">
      
      {/* DELETE CONFIRMATION MODAL */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isDeleting && setPendingDeleteId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden ring-1 ring-slate-100" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4 text-red-600 mb-4">
                    <div className="bg-red-50 p-3 rounded-full border border-red-100">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Delete Patient Record?</h3>
                </div>
                
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Are you sure you want to permanently delete this patient record? This action <span className="font-semibold text-slate-900">cannot be undone</span>.
                </p>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setPendingDeleteId(null)}
                        disabled={isDeleting}
                        className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeDelete}
                        disabled={isDeleting}
                        className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                        {isDeleting ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                        <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-30 sticky top-0">
          <Logo collapsed={true} />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg bg-slate-800 text-slate-300">
              {mobileMenuOpen ? <X /> : <Menu />}
          </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-40 transform transition-transform duration-300 md:translate-x-0 md:relative print:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800/50">
           <Logo />
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Main Module</p>
          {menuItems.map((item) => (
            <button 
                key={item.id}
                onClick={() => handleMenuClick(item.id as any)} 
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                    view === item.id 
                    ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-900/30' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
            >
                <div className="flex items-center space-x-3.5 relative z-10">
                    <item.icon size={20} className={view === item.id ? 'text-teal-100' : 'text-slate-500 group-hover:text-teal-400 transition-colors'} />
                    <span className="font-medium tracking-wide text-sm">{item.label}</span>
                </div>
                {view === item.id && <ChevronRight size={16} className="text-teal-200 relative z-10" />}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800/50 bg-slate-900">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 shadow-inner">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Cohort</span>
                    <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">{patients.length}</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>TFG Group</span>
                        <span className="font-mono text-slate-300 font-medium">{patients.filter(p => p.group === 'Tympanomeatal Flap Elevation').length}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                        <div className="bg-teal-500 h-full" style={{ width: `${(patients.filter(p => p.group === 'Tympanomeatal Flap Elevation').length / (patients.length || 1)) * 100}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto scroll-smooth print:p-0 print:overflow-visible relative">
        <div className="max-w-7xl mx-auto print:max-w-none print:mx-0 pb-12">
            
            {/* Database Error Banner */}
            {dbError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-8 flex items-start gap-3 animate-fade-in print:hidden shadow-sm">
                <CloudOff className="mt-0.5 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <h3 className="font-bold text-sm">Cloud Connection Issue</h3>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{dbError}</p>
                </div>
              </div>
            )}

            {view === 'dashboard' && (
            <div className="space-y-8 animate-fade-in print:hidden">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
                        <p className="text-slate-500 mt-1">Real-time analysis of your surgical dataset</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={handleExportExcel} 
                            className="bg-white text-slate-700 border border-slate-200 px-5 py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition active:scale-95 font-medium flex items-center gap-2 shadow-sm text-sm"
                        >
                            <FileSpreadsheet size={18} className="text-green-600"/>
                            <span>Export Excel</span>
                        </button>
                        <button 
                            onClick={() => handleMenuClick('entry')} 
                            className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-teal-500/20 hover:to-teal-600 transition active:scale-95 font-medium flex items-center gap-2 text-sm"
                        >
                            <span>+ New Record</span>
                        </button>
                    </div>
                </header>
                
                {loadingPatients ? (
                  <div className="h-96 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
                    <p className="text-sm font-medium">Loading clinical data...</p>
                  </div>
                ) : (
                  <>
                    <Dashboard patients={patients} />
                    
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                            <button onClick={() => handleMenuClick('groups')} className="text-sm text-teal-600 font-medium hover:underline">View All</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                                        <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Group</th>
                                        <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Surgery</th>
                                        <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pre ABG</th>
                                        <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Post 12w ABG</th>
                                        <th className="px-8 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {patients.slice(0, 5).map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-4 whitespace-nowrap">
                                                <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                                            </td>
                                            <td className="px-8 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${p.group.includes('Non') ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                                                    {p.group === 'Non-Elevation' ? 'NTFG' : 'TFG'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-500">
                                                 <span className={`inline-flex items-center gap-1.5 ${p.operatedEar === 'Right' ? 'text-red-600' : 'text-blue-600'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${p.operatedEar === 'Right' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                                    {p.operatedEar} Ear
                                                </span>
                                                <div className="text-xs text-slate-400 mt-0.5 font-mono pl-3">
                                                    {p.operationDate ? new Date(p.operationDate).toLocaleDateString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-600 font-mono font-medium">
                                                {p.operatedEar === 'Right' 
                                                    ? p.preOpAudiometry.right.airBoneGap?.toFixed(1) 
                                                    : p.preOpAudiometry.left.airBoneGap?.toFixed(1)} dB
                                            </td>
                                            <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-600 font-mono font-medium">
                                                {p.operatedEar === 'Right'
                                                    ? p.postOp12WeeksAudiometry.right.airBoneGap?.toFixed(1)
                                                    : p.postOp12WeeksAudiometry.left.airBoneGap?.toFixed(1)} dB
                                            </td>
                                            <td className="px-8 py-4 whitespace-nowrap text-sm text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleEditClick(p)}
                                                        className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); initiateDelete(p.id); }}
                                                        className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  </>
                )}
            </div>
            )}

            {view === 'groups' && (
                <GroupedPatients 
                    patients={patients} 
                    onEdit={handleEditClick} 
                    onDelete={initiateDelete} 
                    deletingId={pendingDeleteId} 
                />
            )}

            {view === 'entry' && (
            <div className="space-y-6 animate-fade-in print:hidden">
                <header className="mb-8 border-b border-slate-200 pb-6">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                            {editingPatient ? <Edit size={24} /> : <Database size={24} />}
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900">{editingPatient ? 'Edit Record' : 'New Entry'}</h2>
                     </div>
                    <p className="text-slate-500 ml-14 max-w-2xl">{editingPatient ? 'Update clinical findings, audiological data, and otoscopy images.' : 'Create a new patient record by entering demographics, pre-operative data, and surgical details.'}</p>
                </header>
                <PatientForm onSave={handleSavePatient} initialData={editingPatient} />
            </div>
            )}

            {view === 'analysis' && (
            <div className="w-full mx-auto space-y-8 animate-fade-in print:space-y-0">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                    <div>
                         <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                <BrainCircuit size={24} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Thesis Analysis</h2>
                        </div>
                        <p className="text-slate-500 ml-14">Deep statistical review powered by Gemini 3 Pro (Thinking Mode)</p>
                    </div>
                    <div className="flex gap-3 ml-14 md:ml-0">
                         {analysisResult && (
                             <button 
                                onClick={() => window.print()}
                                className="flex items-center space-x-2 bg-white text-slate-700 border border-slate-300 px-5 py-3 rounded-xl hover:bg-slate-50 transition shadow-sm font-medium"
                             >
                                <Printer size={18} />
                                <span>Print Report</span>
                             </button>
                         )}
                         <button 
                            onClick={runDeepAnalysis}
                            disabled={analyzing}
                            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition disabled:opacity-50 disabled:shadow-none font-semibold active:scale-95"
                        >
                            {analyzing ? <Sparkles className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            <span>{analyzing ? 'Thinking...' : 'Generate Analysis'}</span>
                        </button>
                    </div>
                </header>

                {analysisResult ? (
                    <div className="bg-white p-16 rounded-none md:rounded-xl shadow-xl border border-slate-200 max-w-[210mm] mx-auto min-h-[297mm] print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full">
                         <article className="prose prose-slate prose-lg max-w-none 
                            prose-headings:font-serif prose-headings:font-bold prose-headings:text-slate-900 
                            prose-h1:text-3xl prose-h1:text-center prose-h1:mb-8 prose-h1:uppercase prose-h1:tracking-wider
                            prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2 prose-h2:mt-10 prose-h2:text-indigo-900
                            prose-p:text-justify prose-p:leading-relaxed prose-p:text-slate-700
                            prose-strong:text-slate-900 prose-strong:font-bold
                            prose-table:border-collapse prose-table:w-full prose-table:my-8
                            prose-th:bg-slate-50 prose-th:p-3 prose-th:text-left prose-th:font-bold prose-th:text-slate-800 prose-th:border prose-th:border-slate-300
                            prose-td:p-3 prose-td:border prose-td:border-slate-300 prose-td:text-slate-700
                            print:text-black print:prose-headings:text-black
                          ">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult}</ReactMarkdown>
                        </article>
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center print:hidden">
                        <div className="bg-indigo-50 p-6 rounded-full mb-6 ring-8 ring-indigo-50/50">
                            <BrainCircuit size={48} className="text-indigo-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready for Analysis</h3>
                        <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                            Click "Generate Analysis" to have Gemini Biostatistician review your current dataset of <span className="font-bold text-slate-900">{patients.length} patients</span>.
                        </p>
                    </div>
                )}
            </div>
            )}

            {view === 'search' && <LiteratureSearch />}
            
            {view === 'generator' && <FakeDataGenerator onSaveBatch={handleSaveBatch} />}
        </div>
      </main>
    </div>
  );
};

export default App;

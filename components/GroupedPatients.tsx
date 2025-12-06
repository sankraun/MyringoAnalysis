import React, { useState } from 'react';
import { Patient, SurgeryGroup } from '../types';
import { Edit, Trash2, Loader2, Users, FileText, Activity } from 'lucide-react';

interface GroupedPatientsProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

const GroupedPatients: React.FC<GroupedPatientsProps> = ({ patients, onEdit, onDelete, deletingId }) => {
  const [activeGroup, setActiveGroup] = useState<SurgeryGroup>(SurgeryGroup.TFG);

  const tfgPatients = patients.filter(p => p.group === SurgeryGroup.TFG);
  const ntfgPatients = patients.filter(p => p.group === SurgeryGroup.NTFG);

  const currentList = activeGroup === SurgeryGroup.TFG ? tfgPatients : ntfgPatients;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Patient Cohorts</h2>
          <p className="text-gray-500 mt-1">Manage patients separated by surgical technique</p>
        </div>
      </header>

      {/* Group Tabs */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveGroup(SurgeryGroup.TFG)}
          className={`p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            activeGroup === SurgeryGroup.TFG
              ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-md'
              : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className={`p-3 rounded-full ${activeGroup === SurgeryGroup.TFG ? 'bg-teal-200 text-teal-800' : 'bg-gray-100'}`}>
            <Users size={24} />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg">TFG Group</h3>
            <span className="text-sm opacity-80">{tfgPatients.length} Patients</span>
          </div>
        </button>

        <button
          onClick={() => setActiveGroup(SurgeryGroup.NTFG)}
          className={`p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            activeGroup === SurgeryGroup.NTFG
              ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-md'
              : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
          }`}
        >
           <div className={`p-3 rounded-full ${activeGroup === SurgeryGroup.NTFG ? 'bg-orange-200 text-orange-800' : 'bg-gray-100'}`}>
            <Users size={24} />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg">NTFG Group</h3>
            <span className="text-sm opacity-80">{ntfgPatients.length} Patients</span>
          </div>
        </button>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-gray-400" />
            {activeGroup === SurgeryGroup.TFG ? 'Tympanomeatal Flap Elevation' : 'Non-Elevation'} Records
          </h3>
          <span className="text-xs font-mono text-gray-400">Total: {currentList.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Details</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Operated Ear</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pre-Op ABG</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">12w Outcome</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentList.map(p => {
                 // Determine operated ear metrics
                 const ear = p.operatedEar;
                 const preABG = ear === 'Right' ? p.preOpAudiometry.right.airBoneGap : p.preOpAudiometry.left.airBoneGap;
                 const postABG = ear === 'Right' ? p.postOp12WeeksAudiometry.right.airBoneGap : p.postOp12WeeksAudiometry.left.airBoneGap;
                 const graftStatus = ear === 'Right' ? p.postOp12WeeksOtoscopy.right.graftUptake : p.postOp12WeeksOtoscopy.left.graftUptake;
                 
                 return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{p.name}</span>
                        <span className="text-xs text-gray-500">{p.age}y / {p.sex} • {p.address}</span>
                        <span className="text-xs text-gray-400 mt-1 truncate max-w-[200px]">{p.diagnosis}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${p.operatedEar === 'Right' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            {p.operatedEar} Ear
                        </span>
                        <div className="text-xs text-gray-400 mt-1 font-mono">
                            {p.operationDate ? new Date(p.operationDate).toLocaleDateString() : 'No Date'}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="text-sm font-mono text-gray-700">{preABG?.toFixed(1) || '-'} dB</span>
                            <span className="text-[10px] text-gray-400 uppercase">Air-Bone Gap</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${graftStatus === 'Uptake' ? 'bg-green-500' : graftStatus === 'Fail' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                                <span className="text-sm font-medium text-gray-700">{graftStatus || 'Pending'}</span>
                             </div>
                             {postABG !== undefined && (
                                 <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Activity size={12} />
                                    ABG: {postABG.toFixed(1)} dB
                                 </span>
                             )}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => onEdit(p)}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-3 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 relative z-10"
                            title="Edit Record"
                            disabled={!!deletingId}
                        >
                            <Edit size={18} />
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("Group View: Initiating delete for ID:", p.id);
                                onDelete(p.id);
                            }}
                            className="text-gray-400 hover:text-red-600 transition-colors p-3 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 relative z-10"
                            title="Delete Record"
                            disabled={deletingId === p.id}
                        >
                            <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                 );
              })}
              {currentList.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                            <Users size={32} className="opacity-20" />
                            <p>No patients found in this group.</p>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GroupedPatients;
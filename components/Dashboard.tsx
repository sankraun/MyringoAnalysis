import React from 'react';
import { Patient, SurgeryGroup } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Users, Activity, CheckCircle2, TrendingUp, Ear } from 'lucide-react';

interface DashboardProps {
  patients: Patient[];
}

const StatCard: React.FC<{ title: string; value: string; subtext: string; icon: React.ElementType; color: string }> = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 flex items-start justify-between group">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-xs text-slate-500 font-medium">{subtext}</p>
    </div>
    <div className={`p-3 rounded-xl ${color} text-white shadow-lg opacity-90 group-hover:scale-110 transition-transform duration-300`}>
      <Icon size={20} />
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ patients }) => {
  if (patients.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Users className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Patient Data</h3>
            <p className="text-slate-500 max-w-sm mt-2">Start by adding a new patient record or generating synthetic data to see the dashboard come to life.</p>
        </div>
    );
  }

  // --- Calculations ---

  // Graft Uptake
  const calculateUptake = (group: SurgeryGroup) => {
    const groupPatients = patients.filter(p => p.group === group);
    const uptakeCount = groupPatients.filter(p => {
        const ear = p.operatedEar;
        if (ear === 'Right') return p.postOp12WeeksOtoscopy.right.graftUptake === 'Uptake';
        if (ear === 'Left') return p.postOp12WeeksOtoscopy.left.graftUptake === 'Uptake';
        return false;
    }).length;
    return { name: group, value: uptakeCount, total: groupPatients.length };
  };

  const tfgUptake = calculateUptake(SurgeryGroup.TFG);
  const ntfgUptake = calculateUptake(SurgeryGroup.NTFG);
  
  const totalPatients = patients.length;
  const totalSuccess = tfgUptake.value + ntfgUptake.value;
  const globalSuccessRate = totalPatients > 0 ? ((totalSuccess / totalPatients) * 100).toFixed(1) : '0.0';

  const uptakeData = [
    { name: 'TFG Success', value: tfgUptake.value },
    { name: 'TFG Fail', value: tfgUptake.total - tfgUptake.value },
    { name: 'NTFG Success', value: ntfgUptake.value },
    { name: 'NTFG Fail', value: ntfgUptake.total - ntfgUptake.value },
  ];

  const PIE_COLORS = ['#0f766e', '#ccfbf1', '#3b82f6', '#dbeafe']; // Teal 700, Teal 100, Blue 500, Blue 100

  // Hearing Improvement (ABG Closure)
  const calcAvgImprovement = (group: SurgeryGroup) => {
    const groupPatients = patients.filter(p => p.group === group);
    if(groupPatients.length === 0) return 0;
    
    const totalImp = groupPatients.reduce((sum, p) => {
        const ear = p.operatedEar;
        const pre = ear === 'Right' ? p.preOpAudiometry.right.airBoneGap : p.preOpAudiometry.left.airBoneGap;
        const post = ear === 'Right' ? p.postOp12WeeksAudiometry.right.airBoneGap : p.postOp12WeeksAudiometry.left.airBoneGap;
        return sum + ((pre || 0) - (post || 0));
    }, 0);
    return totalImp / groupPatients.length;
  };

  const tfgGain = calcAvgImprovement(SurgeryGroup.TFG);
  const ntfgGain = calcAvgImprovement(SurgeryGroup.NTFG);

  const hearingData = [
    { name: 'TFG Group', improvement: parseFloat(tfgGain.toFixed(1)) },
    { name: 'NTFG Group', improvement: parseFloat(ntfgGain.toFixed(1)) },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Cohort" 
            value={totalPatients.toString()} 
            subtext={`${tfgUptake.total} TFG / ${ntfgUptake.total} NTFG`} 
            icon={Users} 
            color="bg-slate-800"
        />
        <StatCard 
            title="Overall Success" 
            value={`${globalSuccessRate}%`} 
            subtext="Graft Uptake Rate (12w)" 
            icon={CheckCircle2} 
            color="bg-emerald-500"
        />
        <StatCard 
            title="TFG Hearing Gain" 
            value={`${tfgGain.toFixed(1)} dB`} 
            subtext="Avg. ABG Closure" 
            icon={Ear} 
            color="bg-teal-600"
        />
        <StatCard 
            title="NTFG Hearing Gain" 
            value={`${ntfgGain.toFixed(1)} dB`} 
            subtext="Avg. ABG Closure" 
            icon={Activity} 
            color="bg-blue-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Pie Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
             <h3 className="text-lg font-bold text-slate-800">Graft Uptake Comparison</h3>
             <p className="text-sm text-slate-500">Distribution of successful closures by technique</p>
          </div>
          <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={uptakeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {uptakeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
               <div className="text-center">
                  <span className="block text-3xl font-bold text-slate-800">{totalSuccess}</span>
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Healed</span>
               </div>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
             <h3 className="text-lg font-bold text-slate-800">Hearing Improvement</h3>
             <p className="text-sm text-slate-500">Mean Air-Bone Gap (ABG) closure in decibels</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hearingData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} label={{ value: 'dB Gain', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }} />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="improvement" radius={[8, 8, 0, 0]}>
                    {hearingData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={index === 0 ? '#0d9488' : '#3b82f6'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

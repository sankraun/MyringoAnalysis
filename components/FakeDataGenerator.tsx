import React, { useState } from 'react';
import { Patient, SurgeryGroup, INITIAL_AUDIOMETRY, INITIAL_OTOSCOPY, calculateAverage, calculateABG, AudiometryResult, EarData, Frequencies } from '../types';
import { Wand2, Save, RefreshCw, Trash2, CheckCircle, Table as TableIcon, Users } from 'lucide-react';

interface FakeDataGeneratorProps {
  onSaveBatch: (patients: Patient[]) => Promise<void>;
}

// Data Arrays for Randomization
const FIRST_NAMES_MALE = ["Aarav", "Binod", "Bishal", "Deepak", "Ganesh", "Hari", "Krishna", "Mahesh", "Nabin", "Prakash", "Ramesh", "Santosh", "Suresh", "Bijay", "Ram", "Shyam", "Arjun", "Kiran", "Roshan", "Suman"];
const FIRST_NAMES_FEMALE = ["Anjali", "Bina", "Gita", "Jamuna", "Laxmi", "Maya", "Nisha", "Prativa", "Rita", "Saraswati", "Sita", "Sunita", "Tara", "Urmila", "Rabina", "Sushma", "Manju", "Pooja", "Sabina"];
const LAST_NAMES = ["Adhikari", "Basnet", "Bhattarai", "Gurung", "Karki", "Khadka", "Lama", "Magar", "Maharjan", "Nepal", "Paudel", "Rai", "Shrestha", "Tamang", "Thapa", "Tiwari", "Upadhyaya", "Yadav", "Sherpa", "Ghale", "KC", "Bhandari"];
const ADDRESSES = ["Dhulikhel", "Banepa", "Panauti", "Kathmandu", "Bhaktapur", "Lalitpur", "Pokhara", "Dharan", "Biratnagar", "Chitwan", "Butwal", "Hetauda", "Narayanghat", "Kavre", "Sanga", "Panchkhal"];
const RELIGIONS = ["Hindu", "Buddhist", "Christian", "Kirat", "Muslim"];
const EDUCATIONS = ["Illiterate", "Primary", "Secondary", "Higher Secondary", "Bachelor", "Master"];
const DIAGNOSES = ["Chronic Otitis Media (Mucosal)", "CSOM Tubotympanic", "Inactive Mucosal COM", "Subtotal Perforation", "Central Perforation"];

// Helper Randomizers
const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate believable Audiometry Data
const generateAudiometry = (type: 'normal' | 'conductive_loss' | 'postop_success' | 'postop_fail'): EarData => {
  let acBase = 10;
  let bcBase = 5;
  let gap = 0;

  if (type === 'normal') {
    acBase = 15;
    bcBase = 10;
  } else if (type === 'conductive_loss') {
    acBase = 45; // Hearing loss
    bcBase = 10; // Good nerve
  } else if (type === 'postop_success') {
    acBase = 20; // Improved
    bcBase = 10;
  } else if (type === 'postop_fail') {
    acBase = 40; // No change
    bcBase = 10;
  }

  // Helper to add variance
  const v = () => randomInt(-5, 5); 

  const ac: Frequencies = {
    f500: Math.max(0, acBase + v()),
    f1k: Math.max(0, acBase + v()),
    f2k: Math.max(0, acBase + v()),
    f4k: Math.max(0, acBase + v() + 5), // Higher freq usually slightly worse
    avg: 0
  };

  const bc: Frequencies = {
    f500: Math.max(0, bcBase + v()),
    f1k: Math.max(0, bcBase + v()),
    f2k: Math.max(0, bcBase + v()),
    f4k: Math.max(0, bcBase + v()),
    avg: 0
  };

  ac.avg = calculateAverage(ac);
  bc.avg = calculateAverage(bc);

  return {
    airConduction: ac,
    boneConduction: bc,
    airBoneGap: calculateABG(ac.avg, bc.avg)
  };
};

const FakeDataGenerator: React.FC<FakeDataGeneratorProps> = ({ onSaveBatch }) => {
  const [count, setCount] = useState(10);
  const [generatedData, setGeneratedData] = useState<Patient[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    const newPatients: Patient[] = [];

    for (let i = 0; i < count; i++) {
      const isMale = Math.random() > 0.5;
      const firstName = isMale ? random(FIRST_NAMES_MALE) : random(FIRST_NAMES_FEMALE);
      const lastName = random(LAST_NAMES);
      const operatedEar = Math.random() > 0.5 ? 'Right' : 'Left';
      const isTFG = Math.random() > 0.5;
      
      // Operation date: Random day in last 18 months
      const opDate = new Date();
      opDate.setDate(opDate.getDate() - randomInt(90, 500));
      
      // Success logic (Graft uptake)
      // Let's say TFG has slightly better stats for simulation sake, or equal
      // 90% success rate generally
      const isSuccess = Math.random() < 0.90; 

      const preOpEar = generateAudiometry('conductive_loss');
      const otherEar = Math.random() > 0.7 ? generateAudiometry('normal') : generateAudiometry('conductive_loss'); // 30% chance bilateral
      
      const postOpEar = isSuccess ? generateAudiometry('postop_success') : generateAudiometry('postop_fail');

      newPatients.push({
        id: crypto.randomUUID(),
        name: `${firstName} ${lastName}`,
        age: randomInt(18, 70),
        sex: isMale ? 'Male' : 'Female',
        address: random(ADDRESSES),
        religion: random(RELIGIONS),
        education: random(EDUCATIONS),
        bmi: randomInt(19, 32),
        operatedEar: operatedEar,
        operationDate: opDate.toISOString().split('T')[0],
        group: isTFG ? SurgeryGroup.TFG : SurgeryGroup.NTFG,
        diagnosis: random(DIAGNOSES),
        
        preOpOtoscopy: {
          right: { perforationSize: 'Medium', quadrant: 'Antero-inferior' },
          left: { perforationSize: 'Intact', quadrant: '-' }
        },
        preOpAudiometry: {
          right: operatedEar === 'Right' ? preOpEar : otherEar,
          left: operatedEar === 'Left' ? preOpEar : otherEar,
        },

        // 6 Weeks
        postOp6WeeksOtoscopy: {
          right: { perforationSize: '', quadrant: '', graftUptake: (operatedEar === 'Right' && isSuccess) ? 'Uptake' : (operatedEar === 'Right' ? 'Fail' : undefined) },
          left: { perforationSize: '', quadrant: '', graftUptake: (operatedEar === 'Left' && isSuccess) ? 'Uptake' : (operatedEar === 'Left' ? 'Fail' : undefined) }
        },
        postOp6WeeksAudiometry: {
          right: operatedEar === 'Right' ? postOpEar : otherEar, // Assuming non-op ear stable
          left: operatedEar === 'Left' ? postOpEar : otherEar,
        },

        // 12 Weeks (Similar to 6 weeks for stability, maybe slight improvement)
        postOp12WeeksOtoscopy: {
          right: { perforationSize: '', quadrant: '', graftUptake: (operatedEar === 'Right' && isSuccess) ? 'Uptake' : (operatedEar === 'Right' ? 'Fail' : undefined) },
          left: { perforationSize: '', quadrant: '', graftUptake: (operatedEar === 'Left' && isSuccess) ? 'Uptake' : (operatedEar === 'Left' ? 'Fail' : undefined) }
        },
        postOp12WeeksAudiometry: {
            right: operatedEar === 'Right' ? postOpEar : otherEar,
            left: operatedEar === 'Left' ? postOpEar : otherEar,
        }
      });
    }

    setGeneratedData(newPatients);
    setIsGenerating(false);
  };

  const handleSave = async () => {
    if (generatedData.length === 0) return;
    setIsSaving(true);
    await onSaveBatch(generatedData);
    setIsSaving(false);
    setGeneratedData([]); // Clear after save
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100">
        <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Users size={28} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Fake Data Generator</h2>
            <p className="text-sm text-gray-500">Generate synthetic Nepali patient data for thesis testing</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8 items-end bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Patients</label>
            <input 
                type="number" 
                min="1" 
                max="100" 
                value={count} 
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
            />
        </div>
        <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 h-[42px]"
        >
            <Wand2 size={18} />
            {isGenerating ? 'Generating...' : 'Generate Data'}
        </button>
      </div>

      {generatedData.length > 0 && (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <TableIcon size={20} className="text-gray-400" />
                    Preview ({generatedData.length} records)
                </h3>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setGeneratedData([])}
                        className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={18} /> Clear
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-teal-600 text-white px-6 py-2 rounded-xl hover:bg-teal-700 font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Save to Database
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Demographics</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Group</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Op Ear</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Diagnosis</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">12w Outcome</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 text-sm">
                        {generatedData.map((p, i) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                                <td className="px-6 py-3 text-gray-500">{p.age}y / {p.sex} / {p.address}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.group === SurgeryGroup.TFG ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'}`}>
                                        {p.group === SurgeryGroup.TFG ? 'TFG' : 'NTFG'}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-gray-500">{p.operatedEar}</td>
                                <td className="px-6 py-3 text-gray-500 truncate max-w-[150px]">{p.diagnosis}</td>
                                <td className="px-6 py-3">
                                    {(p.operatedEar === 'Right' ? p.postOp12WeeksOtoscopy.right.graftUptake : p.postOp12WeeksOtoscopy.left.graftUptake) === 'Uptake' ? (
                                        <span className="flex items-center text-green-600 font-medium gap-1"><CheckCircle size={14}/> Uptake</span>
                                    ) : (
                                        <span className="text-red-500 font-medium">Fail</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default FakeDataGenerator;
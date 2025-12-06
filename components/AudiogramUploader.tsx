import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, ImageIcon } from 'lucide-react';
import { analyzeAudiogramImage } from '../services/gemini';
import { AudiometryResult } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AudiogramUploaderProps {
  onDataExtracted: (data: AudiometryResult) => void;
  currentImageUrl?: string;
}

const AudiogramUploader: React.FC<AudiogramUploaderProps> = ({ onDataExtracted, currentImageUrl }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audiograms')
        .upload(fileName, file);

      let publicUrl = '';

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        // Continue without upload if it fails, but warn user
        setError('Image upload failed, but attempting AI analysis...');
      } else {
        const { data: urlData } = supabase.storage.from('audiograms').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }

      // 2. Read for Gemini Analysis (Client-side)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];
        
        try {
          const result = await analyzeAudiogramImage(base64Data, file.type);
          
          // Map API result to our strict types
          const mappedData: AudiometryResult = {
            right: {
               airConduction: { ...result.right.airConduction, avg: 0 },
               boneConduction: { ...result.right.boneConduction, avg: 0 },
            },
            left: {
               airConduction: { ...result.left.airConduction, avg: 0 },
               boneConduction: { ...result.left.boneConduction, avg: 0 },
            },
            imageUrl: publicUrl || undefined
          };
          
          onDataExtracted(mappedData);
        } catch (err) {
            console.error(err);
          setError("Failed to analyze image. Ensure it is a clear audiogram.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Error processing file.");
      setLoading(false);
    }
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-white hover:bg-gray-50 transition-colors text-center group cursor-pointer relative overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-2">
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
          <p className="text-xs font-medium text-teal-700">Uploading & Analyzing...</p>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center space-y-1 py-1">
          {currentImageUrl ? (
            <div className="relative w-full h-16 mb-2">
               <img src={currentImageUrl} alt="Audiogram" className="h-full w-full object-contain rounded-md opacity-80" />
               <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                 <span className="text-[10px] font-bold">Replace</span>
               </div>
            </div>
          ) : (
            <div className="bg-teal-50 p-2 rounded-full mb-1 group-hover:scale-110 transition-transform">
               <Upload className="w-5 h-5 text-teal-600" />
            </div>
          )}
          <span className="text-xs font-semibold text-gray-700">{currentImageUrl ? 'Update Chart' : 'Upload Chart'}</span>
          <span className="text-[10px] text-gray-400">Auto-save to Cloud</span>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      )}
      {error && (
        <div className="absolute inset-0 bg-white flex items-center justify-center text-red-500 text-xs gap-1 p-2 border border-red-100 rounded-xl">
          <AlertCircle className="w-4 h-4" />
          <span className="line-clamp-2">{error}</span>
        </div>
      )}
    </div>
  );
};

export default AudiogramUploader;

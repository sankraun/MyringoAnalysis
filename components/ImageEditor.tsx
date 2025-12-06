import React, { useState } from 'react';
import { Upload, Wand2, RefreshCw, Image as ImageIcon, Save, Check, Link as LinkIcon } from 'lucide-react';
import { editMedicalImage } from '../services/gemini';
import { supabase } from '../lib/supabaseClient';

const ImageEditor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResultUrl(null);
      setSavedUrl(null);
    }
  };

  const handleEdit = async () => {
    if (!selectedFile || !prompt) return;

    setLoading(true);
    setResultUrl(null);
    setSavedUrl(null);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        
        const newImage = await editMedicalImage(base64Data, selectedFile.type, prompt);
        if (newImage) {
            setResultUrl(newImage);
        } else {
            alert("No image returned from editing.");
        }
        setLoading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (e) {
        console.error(e);
        setLoading(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (!resultUrl) return;

    setSaving(true);
    try {
        // Convert Base64 back to Blob
        const base64Data = resultUrl.split(',')[1];
        const contentType = resultUrl.split(',')[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: contentType});

        const fileName = `edited-${Date.now()}.png`;
        const { error } = await supabase.storage
            .from('edited_images')
            .upload(fileName, blob);

        if (error) {
            // Try fallback bucket name if 'edited_images' fails, or just 'audiograms'
             const { error: retryError } = await supabase.storage
                .from('audiograms')
                .upload(fileName, blob);
             if(retryError) throw retryError;
        }

        const { data: urlData } = supabase.storage.from('edited_images').getPublicUrl(fileName);
        // Fallback check
        const finalUrl = urlData.publicUrl.includes('undefined') 
            ? supabase.storage.from('audiograms').getPublicUrl(fileName).data.publicUrl
            : urlData.publicUrl;

        setSavedUrl(finalUrl);
    } catch (e) {
        console.error("Save failed:", e);
        alert("Failed to save to cloud storage.");
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100">
        <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
            <Wand2 size={28} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Medical Image Editor</h2>
            <p className="text-sm text-gray-500">Powered by Gemini 2.5 Flash Image ("Nano Banana")</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className={`border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center relative bg-gray-50 overflow-hidden transition-all ${!previewUrl ? 'border-gray-300 hover:border-purple-300 hover:bg-gray-100' : 'border-purple-200'}`}>
                {previewUrl ? (
                    <img src={previewUrl} alt="Original" className="h-full w-full object-contain p-2" />
                ) : (
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                            <Upload className="text-purple-500" size={24} />
                        </div>
                        <h3 className="font-semibold text-gray-700">Upload Image</h3>
                        <span className="text-gray-500 text-sm mt-1 block">Drag & drop or click to browse</span>
                    </div>
                )}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
            </div>
            
            <div className="flex gap-3">
                <input 
                    type="text" 
                    placeholder="Describe the edit (e.g., Highlight the perforation in red)" 
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-400 hover:border-gray-400"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                <button 
                    onClick={handleEdit}
                    disabled={!selectedFile || loading || !prompt}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
                >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                    <span>Generate</span>
                </button>
            </div>
        </div>

        <div className="space-y-4">
            <div className="border border-gray-200 rounded-2xl h-80 bg-gray-900 flex items-center justify-center relative overflow-hidden shadow-inner group">
                {resultUrl ? (
                    <img src={resultUrl} alt="Edited" className="h-full w-full object-contain" />
                ) : (
                    <div className="text-center">
                        <ImageIcon className="mx-auto text-gray-700 mb-2" size={48} />
                        <span className="text-gray-500">Edited result will appear here</span>
                    </div>
                )}
                {loading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                        <RefreshCw className="text-white animate-spin mb-3" size={32} />
                        <span className="text-white font-medium animate-pulse">Processing Image...</span>
                    </div>
                )}
            </div>

            {resultUrl && (
                <div className="flex gap-3">
                     <button 
                        onClick={handleSaveToCloud}
                        disabled={saving || !!savedUrl}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${savedUrl ? 'bg-green-100 text-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                    >
                        {saving ? <RefreshCw className="animate-spin" size={18} /> : savedUrl ? <Check size={18} /> : <Save size={18} />}
                        <span>{saving ? 'Saving...' : savedUrl ? 'Saved to Supabase' : 'Save to Cloud'}</span>
                    </button>
                    {savedUrl && (
                        <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 flex items-center justify-center">
                            <LinkIcon size={18} />
                        </a>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;

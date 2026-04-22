import { useState, useRef, useId } from 'react'; // Import useId
import { Button, Box, Typography, Avatar } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ImageUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  existingImageUrl?: string;
  multiple?: boolean;
}

export default function ImageUpload({ label, onFileSelect, existingImageUrl, multiple = false }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [fileName, setFileName] = useState<string>('');
  
  // THE FIX: This hook generates a unique ID for each instance of the component
  const uniqueId = useId();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setFileName('');
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="subtitle1" gutterBottom>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {previewUrl && (
          <Avatar src={previewUrl} sx={{ width: 80, height: 80, objectFit: 'cover' }} variant="rounded" />
        )}
        <input
          accept="image/*,video/*"
          id={uniqueId} // Use the unique ID
          type="file"
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
          multiple={multiple}
        />
        <label htmlFor={uniqueId}> {/* Use the unique ID */}
          <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
            {previewUrl ? 'Change File' : 'Select File'}
          </Button>
        </label>
        {previewUrl && (
          <Box>
            <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>{fileName || 'Current Image'}</Typography>
            <Button variant="text" color="error" onClick={handleRemoveImage} size="small" sx={{p: 0}}>
              Remove
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
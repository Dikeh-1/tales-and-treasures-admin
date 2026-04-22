import { useState, useRef } from 'react';
import { Button, Box, Typography, Avatar } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageCropperModal from './ImageCropperModal';

interface ImageUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  previewUrl?: string | null; // Now accepts a preview URL from the parent
}

export default function ImageUpload({ label, onFileSelect, previewUrl }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImageComplete = (croppedImageFile: File) => {
    onFileSelect(croppedImageFile);
    setImageToCrop(null);
  };

  const handleCropperClose = () => {
    setImageToCrop(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    onFileSelect(null); // Tell the parent to clear the image
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {previewUrl && (
          <Avatar src={previewUrl} sx={{ width: 80, height: 80, objectFit: 'cover' }} />
        )}
        <input
          accept="image/*"
          id="contained-button-file"
          type="file"
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
        />
        <label htmlFor="contained-button-file">
          <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
            {previewUrl ? 'Change Image' : 'Select Image'}
          </Button>
        </label>
        {previewUrl && (
          <Button variant="text" color="error" onClick={handleRemoveImage} size="small">
            Remove
          </Button>
        )}
      </Box>

      <ImageCropperModal
        open={!!imageToCrop}
        imageSrc={imageToCrop}
        onClose={handleCropperClose}
        onCropComplete={handleCroppedImageComplete}
      />
    </Box>
  );
}
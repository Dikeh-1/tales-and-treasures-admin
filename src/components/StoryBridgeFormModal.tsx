import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  Box, 
  CircularProgress 
} from '@mui/material';
import ImageUpload from './ImageUpload';

interface FormData {
  title: string;
  description: string;
  imageFile?: File | null;
  imageUrl?: string;
}

interface StoryBridgeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  initialData?: FormData | null;
  isLoading?: boolean; // 👈 Added prop
}

export default function StoryBridgeFormModal({ 
  open, 
  onClose, 
  onSave, 
  initialData, 
  isLoading = false 
}: StoryBridgeFormModalProps) {
  const [formData, setFormData] = useState<FormData>({ title: '', description: '' });

  useEffect(() => {
    if (open) {
      setFormData(initialData || { title: '', description: '' });
    }
  }, [open, initialData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (file: File | null) => {
    setFormData(prev => ({ ...prev, imageFile: file }));
  };
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={!isLoading ? onClose : undefined} // Prevent close while loading
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        {initialData ? 'Edit Story Bridge' : 'Add New Story Bridge'}
      </DialogTitle>
      
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField 
            fullWidth 
            margin="normal" 
            label="Title" 
            name="title" 
            value={formData.title || ''} 
            onChange={handleChange} 
            required
            autoFocus 
            disabled={isLoading}
          />
          <TextField 
            fullWidth 
            margin="normal" 
            multiline 
            rows={4} 
            label="Description" 
            name="description" 
            value={formData.description || ''} 
            onChange={handleChange}
            required 
            disabled={isLoading}
          />
          <ImageUpload 
            label="Image" 
            onFileSelect={handleFileSelect} 
            existingImageUrl={initialData?.imageUrl}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            type="submit" 
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isLoading ? 'Processing...' : (initialData ? 'Save Changes' : 'Create')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
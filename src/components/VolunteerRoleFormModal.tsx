import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box } from '@mui/material';
import ImageUpload from './ImageUpload';

interface FormData {
  title: string;
  description: string;
  imageFile?: File | null;
  imageUrl?: string;
}

export default function VolunteerRoleFormModal({ open, onClose, onSave, initialData }) {
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initialData ? 'Edit Volunteer Role' : 'Add New Volunteer Role'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField autoFocus fullWidth margin="normal" label="Role Title" name="title" value={formData.title || ''} onChange={handleChange} />
          <TextField fullWidth margin="normal" multiline rows={4} label="Description" name="description" value={formData.description || ''} onChange={handleChange} />
          <ImageUpload label="Image" onFileSelect={handleFileSelect} existingImageUrl={initialData?.imageUrl} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" type="submit">{initialData ? 'Save Changes' : 'Create Role'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
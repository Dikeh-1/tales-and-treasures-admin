import { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Paper } from '@mui/material';
import ImageUpload from './ImageUpload'; // Import our uploader

interface MemberData {
  name: string;
  role: string;
  avatarUrl?: string;
  avatarFile?: File | null;
}

interface TeamMemberFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: MemberData) => void;
  initialData?: MemberData | null;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

export default function TeamMemberFormModal({ open, onClose, onSave, initialData }: TeamMemberFormModalProps) {
  const [formData, setFormData] = useState<MemberData>({ name: '', role: '', avatarFile: null });
  const [errors, setErrors] = useState<Partial<MemberData>>({});

  useEffect(() => {
    if (open) {
      setFormData(initialData || { name: '', role: '', avatarFile: null });
      setErrors({});
    }
  }, [open, initialData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleFileSelect = (file: File | null) => {
    setFormData(prev => ({ ...prev, avatarFile: file }));
  };

  const validate = () => {
    const newErrors: Partial<MemberData> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.role.trim()) newErrors.role = 'Role is required';
    return newErrors;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper sx={style}>
        <Typography variant="h6">
            {initialData ? 'Edit Team Member' : 'Add New Team Member'}
          </Typography>
        <Box component="form" sx={{ mt: 2 }} onSubmit={handleSubmit} noValidate>
          <ImageUpload label="Profile Picture" onFileSelect={handleFileSelect} />
            <TextField
            fullWidth margin="normal" label="Full Name" name="name"
            value={formData.name} onChange={handleChange} autoFocus
            error={!!errors.name} helperText={errors.name}
            />
            <TextField
            fullWidth margin="normal" label="Role" name="role"
            value={formData.role} onChange={handleChange}
            error={!!errors.role} helperText={errors.role}
          />
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} sx={{ mr: 1 }}>Cancel</Button>
            <Button variant="contained" type="submit">
              {initialData ? 'Save Changes' : 'Create Member'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
}
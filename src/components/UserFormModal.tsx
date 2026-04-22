import { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import LoadingOverlay from './LoadingOverlay';

interface UserData {
  name: string;
  email: string;
  role: 'Subscriber' | 'Admin';
  status: 'Active' | 'Suspended';
}

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<UserData>) => void;
  initialData?: UserData | null;
  loading: boolean;
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
  borderRadius: 2,
};

export default function UserFormModal({ open, onClose, onSave, initialData, loading }: UserFormModalProps) {
  const [formData, setFormData] = useState<Partial<UserData>>({});

  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
    }
  }, [open, initialData]);

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper sx={{ ...style, position: 'relative' }}>
        {loading && <LoadingOverlay message="Saving..." />}
        <Typography variant="h6" component="h2" gutterBottom>
          Edit Account: {initialData?.name}
        </Typography>
        <Box component="form" sx={{ mt: 2 }} onSubmit={handleSubmit} noValidate>
          <TextField fullWidth margin="normal" label="Email" value={formData.email || ''} disabled />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role || ''} label="Role" onChange={handleChange}>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Subscriber">Subscriber</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status || ''} label="Status" onChange={handleChange}>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="contained" type="submit" disabled={loading} sx={{ ml: 1 }}>Save Changes</Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
}
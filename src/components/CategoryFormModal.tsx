import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, CircularProgress } from '@mui/material';

export default function CategoryFormModal({ open, onClose, onSave, initialData, loading }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
    }
  }, [open, initialData]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({ name });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? 'Edit Category' : 'Create New Category'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            label="Category Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="contained" type="submit" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : (initialData ? 'Save Changes' : 'Create Category')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
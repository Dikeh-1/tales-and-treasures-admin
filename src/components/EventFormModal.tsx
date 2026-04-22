import { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Paper } from '@mui/material';

// This interface now correctly expects a Date object for initial data
interface EventData {
  title: string;
  description: string;
  eventDate: Date;
}

// The internal state for the form will handle the date as a string
interface FormState {
    title: string;
    description: string;
    eventDate: string; // The text field requires a string in 'YYYY-MM-DD' format
}

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: EventData) => void;
  initialData?: EventData | null;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

// Helper to format a Date object to a 'YYYY-MM-DD' string
const formatDateForInput = (date?: Date): string => {
  if (!date) return '';
  // Ensure we are working with a Date object before calling its methods
  return new Date(date).toISOString().split('T')[0];
};

export default function EventFormModal({ open, onClose, onSave, initialData }: EventFormModalProps) {
  const [formData, setFormData] = useState<FormState>({ title: '', description: '', eventDate: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});

  useEffect(() => {
    if (open) {
      const formattedData = initialData
        ? { ...initialData, eventDate: formatDateForInput(initialData.eventDate) }
        : { title: '', description: '', eventDate: '' };
      setFormData(formattedData);
      setErrors({});
    }
  }, [open, initialData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const validate = () => {
    const newErrors: Partial<FormState> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';
    return newErrors;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    // Convert date string from input back to a Date object before saving
    onSave({
      ...formData,
      eventDate: new Date(formData.eventDate),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper sx={style}>
        <Typography variant="h6">
          {initialData ? 'Edit Event' : 'Create New Event'}
        </Typography>
        <Box component="form" sx={{ mt: 2 }} onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth margin="normal" label="Event Title" name="title"
            value={formData.title} onChange={handleChange} autoFocus
            error={!!errors.title} helperText={errors.title}
          />
          <TextField
            fullWidth margin="normal" label="Description" name="description"
            value={formData.description} onChange={handleChange}
            error={!!errors.description} helperText={errors.description}
            multiline rows={4}
          />
          <TextField
            fullWidth margin="normal" label="Event Date" name="eventDate"
            type="date" InputLabelProps={{ shrink: true }}
            value={formData.eventDate} onChange={handleChange}
            error={!!errors.eventDate} helperText={errors.eventDate}
          />
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} sx={{ mr: 1 }}>Cancel</Button>
            <Button variant="contained" type="submit">
              {initialData ? 'Save Changes' : 'Create Event'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
}
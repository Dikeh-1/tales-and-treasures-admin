import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LoadingOverlay from './LoadingOverlay';

interface DonationData {
  donorName: string;
  type: 'Financial' | 'Book' | 'Other';
  amount?: number | null;
  details: string;
  donationDate: string; // YYYY-MM-DD
}

interface DonationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DonationData) => void;
  initialData?: Partial<DonationData> | null;
  loading?: boolean; // NEW: added loading prop for overlay
}

export default function DonationFormModal({
  open,
  onClose,
  onSave,
  initialData,
  loading = false,
}: DonationFormModalProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<{
    donorName: string;
    type: 'Financial' | 'Book' | 'Other';
    amount: string;
    details: string;
    donationDate: string;
  }>({ donorName: '', type: 'Financial', amount: '', details: '', donationDate: defaultDate });

  useEffect(() => {
    if (open) {
      setFormData({
        donorName: initialData?.donorName || '',
        type: (initialData?.type as any) || 'Financial',
        amount:
          typeof initialData?.amount === 'number'
            ? String(initialData.amount)
            : initialData?.amount
            ? String(initialData.amount)
            : '',
        details: initialData?.details || '',
        donationDate: initialData?.donationDate || defaultDate,
      });
    }
  }, [open, initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const name = e.target.name as string;
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: DonationData = {
      donorName: formData.donorName.trim(),
      type: formData.type,
      amount:
        formData.type === 'Financial' && formData.amount !== ''
          ? Number(formData.amount)
          : null,
      details: formData.details.trim(),
      donationDate: formData.donationDate,
    };

    onSave(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      aria-labelledby="donation-form-title"
      PaperProps={{
        sx: { position: 'relative', overflow: 'visible' }, // Allow overlay
      }}
    >
      {/* Loading Overlay */}
      {loading && <LoadingOverlay message="Saving..." />}

      <DialogTitle id="donation-form-title">
        {initialData ? 'Edit Donation' : 'Add New Donation'}
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent
          dividers
          sx={{
            p: { xs: 2, sm: 3 },
            maxHeight: { xs: '100vh', sm: '70vh' },
          }}
        >
          <Stack spacing={2}>
            {/* Donor Name */}
            <TextField
              label="Donor Name"
              name="donorName"
              value={formData.donorName}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'aria-label': 'Donor Name' }}
              autoFocus
            />

            {/* Donation Type */}
            <FormControl fullWidth>
              <InputLabel id="donation-type-label">Type</InputLabel>
              <Select
                labelId="donation-type-label"
                label="Type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <MenuItem value="Financial">Financial</MenuItem>
                <MenuItem value="Book">Book</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            {/* Amount Field */}
            {formData.type === 'Financial' && (
              <TextField
                label="Amount (₦)"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                fullWidth
                inputProps={{ min: 0, step: '0.01', inputMode: 'decimal' }}
              />
            )}

            {/* Details */}
            <TextField
              label="Details"
              name="details"
              value={formData.details}
              onChange={handleChange}
              fullWidth
              multiline
              minRows={2}
            />

            {/* Donation Date */}
            <TextField
              label="Donation Date"
              name="donationDate"
              type="date"
              value={formData.donationDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>

        {/* Actions */}
        <DialogActions
          sx={{
            p: { xs: 2, sm: 3 },
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={loading}
            fullWidth={fullScreen}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth={fullScreen}
          >
            {initialData ? 'Save Changes' : 'Add Donation'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

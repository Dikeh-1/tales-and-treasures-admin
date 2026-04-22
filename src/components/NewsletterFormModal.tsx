import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, FormHelperText, Alert } from '@mui/material';
import ImageUpload from './ImageUpload';
import LoadingOverlay from './LoadingOverlay';

export default function NewsletterFormModal({ open, onClose, onSave, loading }) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ subject?: string; content?: string; mediaFile?: string }>({});

  const validate = () => {
    const newErrors: { subject?: string; content?: string; mediaFile?: string } = {};
    if (!subject.trim()) newErrors.subject = 'Subject is required.';
    if (content.trim().length < 10) newErrors.content = 'Content must be at least 10 characters long.';
    if (mediaFile && mediaFile.size > 2 * 1024 * 1024) { // 2MB limit
        newErrors.mediaFile = 'Media file is too large (max 2MB).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({ subject, content, mediaFile });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      {loading && <LoadingOverlay message="Saving and sending..." />}
      <DialogTitle>Create & Send Newsletter</DialogTitle>
      <DialogContent>
        <TextField autoFocus margin="dense" name="subject" label="Subject" type="text" fullWidth variant="outlined" value={subject} onChange={e => setSubject(e.target.value)} error={!!errors.subject} helperText={errors.subject}/>
        <TextField margin="dense" name="content" label="Content / Description" type="text" fullWidth multiline rows={10} variant="outlined" value={content} onChange={e => setContent(e.target.value)} error={!!errors.content} helperText={errors.content} />
        <ImageUpload label="Attach Image or Short Video (Max 2MB)" onFileSelect={setMediaFile} />
        {errors.mediaFile && <FormHelperText error sx={{ mt: 1 }}>{errors.mediaFile}</FormHelperText>}
        <Alert severity="info" sx={{ mt: 2 }}>Clicking 'Send Newsletter' will immediately email this content to all active subscribers.</Alert>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Send Newsletter</Button>
      </DialogActions>
    </Dialog>
  );
}
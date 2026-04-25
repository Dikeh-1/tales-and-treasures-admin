import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, FormHelperText, Alert, Typography } from '@mui/material';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageUpload from './ImageUpload';
import LoadingOverlay from './LoadingOverlay';

export default function NewsletterFormModal({ open, onClose, onSave, loading }) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ subject?: string; content?: string; mediaFile?: string }>({});

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean'],
    ],
  };

  const validate = () => {
    const newErrors: { subject?: string; content?: string; mediaFile?: string } = {};
    if (!subject.trim()) newErrors.subject = 'Subject is required.';
    // Quill returns '<p><br></p>' for empty content, so we check the text length
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 10) newErrors.content = 'Content must be at least 10 characters long.';
    if (mediaFile && mediaFile.size > 5 * 1024 * 1024) { // Increased to 5MB
        newErrors.mediaFile = 'Media file is too large (max 5MB).';
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
      <DialogTitle sx={{ fontWeight: 'bold' }}>Create & Send Newsletter</DialogTitle>
      <DialogContent>
        <TextField 
          autoFocus 
          margin="dense" 
          name="subject" 
          label="Subject Line" 
          type="text" 
          fullWidth 
          variant="outlined" 
          value={subject} 
          onChange={e => setSubject(e.target.value)} 
          error={!!errors.subject} 
          helperText={errors.subject}
          sx={{ mb: 3, mt: 1 }}
        />
        
        <Typography variant="subtitle2" sx={{ mb: 1, color: errors.content ? 'error.main' : 'text.secondary' }}>
          Newsletter Content
        </Typography>
        <Box sx={{ 
          mb: 2, 
          '& .ql-container': { minHeight: '300px', borderRadius: '0 0 8px 8px', fontSize: '16px' },
          '& .ql-toolbar': { borderRadius: '8px 8px 0 0' },
          border: errors.content ? '1px solid #d32f2f' : 'none',
          borderRadius: '8px'
        }}>
          <ReactQuill 
            theme="snow" 
            value={content} 
            onChange={setContent}
            modules={modules}
            placeholder="Write something magical..."
          />
        </Box>
        {errors.content && <FormHelperText error sx={{ mt: -1, mb: 2 }}>{errors.content}</FormHelperText>}

        <ImageUpload label="Attach Header Image (Max 5MB)" onFileSelect={setMediaFile} />
        {errors.mediaFile && <FormHelperText error sx={{ mt: 1 }}>{errors.mediaFile}</FormHelperText>}
        
        <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
          Clicking 'Send Newsletter' will immediately email this content to all active subscribers.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="large" sx={{ px: 4, borderRadius: 2 }}>
          Send Newsletter
        </Button>
      </DialogActions>
    </Dialog>
  );
}
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormHelperText,
  Typography,
  useTheme,
} from '@mui/material';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageUpload from './ImageUpload';
import LoadingOverlay from './LoadingOverlay';
import SendIcon from '@mui/icons-material/Send';

export default function NewsletterFormModal({ open, onClose, onSave, loading }) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ subject?: string; content?: string; mediaFile?: string }>({});
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'clean'],
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link',
  ];

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

  // Theme-adaptive Quill editor styles
  const quillEditorStyles = {
    mb: 2,
    borderRadius: '12px',
    border: errors.content
      ? '2px solid #d32f2f'
      : `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
    overflow: 'hidden',
    transition: 'border-color 0.2s ease',
    '&:hover': {
      borderColor: errors.content
        ? '#d32f2f'
        : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    },
    '&:focus-within': {
      borderColor: errors.content ? '#d32f2f' : theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${errors.content ? 'rgba(211,47,47,0.15)' : `${theme.palette.primary.main}25`}`,
    },
    // Toolbar styles
    '& .ql-toolbar.ql-snow': {
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      padding: '10px 12px',
      borderRadius: '12px 12px 0 0',
    },
    // Toolbar button styles (SVG icons inside)
    '& .ql-toolbar .ql-stroke': {
      stroke: isDark ? '#b0bec5' : '#455a64',
    },
    '& .ql-toolbar .ql-fill': {
      fill: isDark ? '#b0bec5' : '#455a64',
    },
    '& .ql-toolbar .ql-picker-label': {
      color: isDark ? '#cfd8dc' : '#37474f',
    },
    '& .ql-toolbar .ql-picker-options': {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
      borderRadius: '8px',
      boxShadow: isDark
        ? '0 8px 24px rgba(0,0,0,0.5)'
        : '0 8px 24px rgba(0,0,0,0.12)',
    },
    '& .ql-toolbar .ql-picker-item': {
      color: isDark ? '#e0e0e0' : '#333333',
    },
    '& .ql-toolbar button:hover .ql-stroke, & .ql-toolbar .ql-picker-label:hover .ql-stroke': {
      stroke: theme.palette.primary.main,
    },
    '& .ql-toolbar button:hover .ql-fill, & .ql-toolbar .ql-picker-label:hover .ql-fill': {
      fill: theme.palette.primary.main,
    },
    '& .ql-toolbar button.ql-active .ql-stroke': {
      stroke: theme.palette.primary.main,
    },
    '& .ql-toolbar button.ql-active .ql-fill': {
      fill: theme.palette.primary.main,
    },
    '& .ql-toolbar .ql-picker-label:hover': {
      color: theme.palette.primary.main,
    },
    // Color picker specific
    '& .ql-toolbar .ql-color-picker .ql-picker-label svg .ql-stroke': {
      stroke: isDark ? '#b0bec5' : '#455a64',
    },
    // Editor container styles
    '& .ql-container.ql-snow': {
      borderTop: 'none',
      border: 'none',
      minHeight: '300px',
      fontSize: '16px',
      fontFamily: theme.typography.fontFamily,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
      borderRadius: '0 0 12px 12px',
    },
    // Editor text area
    '& .ql-editor': {
      minHeight: '300px',
      color: isDark ? '#e8eaed' : '#1a1a2e',
      lineHeight: 1.7,
      padding: '16px 20px',
      fontSize: '16px',
    },
    // Placeholder text
    '& .ql-editor.ql-blank::before': {
      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
      fontStyle: 'italic',
      fontSize: '15px',
    },
    // Scrollbar
    '& .ql-editor::-webkit-scrollbar': {
      width: '6px',
    },
    '& .ql-editor::-webkit-scrollbar-thumb': {
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
      borderRadius: '3px',
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: isDark ? '#0f1d33' : '#ffffff',
        }
      }}
    >
      {loading && <LoadingOverlay message="Saving and sending..." />}

      {/* Premium header */}
      <DialogTitle
        sx={{
          fontWeight: 800,
          fontSize: '1.4rem',
          background: isDark
            ? 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
            : 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
          color: '#ffffff',
          py: 2.5,
          px: 3,
          letterSpacing: '-0.01em',
        }}
      >
        ✉️ Create & Send Newsletter
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 3, pb: 2 }}>
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
          sx={{
            mb: 3,
            mt: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& input': {
                color: isDark ? '#e8eaed' : '#1a1a2e',
                fontWeight: 500,
              },
            },
            '& .MuiInputLabel-root': {
              color: isDark ? '#9db0c8' : '#4d647d',
            },
          }}
        />

        <Typography
          variant="subtitle2"
          sx={{
            mb: 1,
            fontWeight: 700,
            color: errors.content ? 'error.main' : (isDark ? '#9db0c8' : '#4d647d'),
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Newsletter Content
        </Typography>

        <Box sx={quillEditorStyles}>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            formats={formats}
            placeholder="Write something magical for your subscribers..."
          />
        </Box>
        {errors.content && <FormHelperText error sx={{ mt: -1, mb: 2 }}>{errors.content}</FormHelperText>}

        <ImageUpload label="Attach Header Image (Max 5MB)" onFileSelect={setMediaFile} />
        {errors.mediaFile && <FormHelperText error sx={{ mt: 1 }}>{errors.mediaFile}</FormHelperText>}

        {/* Clearly visible disclaimer */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 138, 175, 0.06)',
            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 138, 175, 0.15)'}`,
          }}
        >
          <Typography sx={{ fontSize: '1.2rem', lineHeight: 1.4, mt: '1px' }}>ℹ️</Typography>
          <Typography
            variant="body2"
            sx={{
              color: isDark ? '#7dd3fc' : '#0c6b8a',
              fontWeight: 500,
              lineHeight: 1.6,
              fontSize: '0.875rem',
            }}
          >
            Clicking <strong>'Send Newsletter'</strong> will immediately email this content to all active subscribers.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 1.5,
          gap: 1,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          sx={{
            px: 3,
            borderRadius: 2,
            fontWeight: 600,
            color: isDark ? '#9db0c8' : '#4d647d',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          size="large"
          startIcon={<SendIcon />}
          sx={{
            px: 4,
            borderRadius: 2,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
            boxShadow: '0 4px 14px rgba(27, 67, 50, 0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #143d2b 0%, #245a42 100%)',
              boxShadow: '0 6px 20px rgba(27, 67, 50, 0.45)',
            },
          }}
        >
          Send Newsletter
        </Button>
      </DialogActions>
    </Dialog>
  );
}
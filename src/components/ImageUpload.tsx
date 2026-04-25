import { useState, useRef, useId } from 'react';
import { Button, Box, Typography, useTheme, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageIcon from '@mui/icons-material/Image';

interface ImageUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  existingImageUrl?: string;
  multiple?: boolean;
}

export default function ImageUpload({ label, onFileSelect, existingImageUrl, multiple = false }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // THE FIX: This hook generates a unique ID for each instance of the component
  const uniqueId = useId();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setFileName('');
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setPreviewUrl(URL.createObjectURL(file));
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1.5,
          fontWeight: 700,
          color: isDark ? '#9db0c8' : '#4d647d',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </Typography>

      <input
        accept="image/*,video/*"
        id={uniqueId}
        type="file"
        hidden
        onChange={handleFileChange}
        ref={fileInputRef}
        multiple={multiple}
      />

      {previewUrl ? (
        /* ── Beautiful image preview card ── */
        <Box
          sx={{
            position: 'relative',
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa',
            boxShadow: isDark
              ? '0 4px 20px rgba(0,0,0,0.3)'
              : '0 4px 20px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Image preview */}
          <Box
            component="img"
            src={previewUrl}
            alt={fileName || 'Preview'}
            sx={{
              width: '100%',
              maxHeight: 280,
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Overlay controls */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              backgroundColor: isDark ? 'rgba(15,29,51,0.95)' : 'rgba(255,255,255,0.97)',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <ImageIcon sx={{ fontSize: 18, color: isDark ? '#6b7280' : '#9ca3af', flexShrink: 0 }} />
              <Typography
                variant="body2"
                noWrap
                sx={{
                  color: isDark ? '#d1d5db' : '#4b5563',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  maxWidth: 260,
                }}
              >
                {fileName || 'Current Image'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <label htmlFor={uniqueId}>
                <Button
                  component="span"
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    px: 2,
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                    color: isDark ? '#d1d5db' : '#4b5563',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  Change
                </Button>
              </label>
              <IconButton
                size="small"
                onClick={handleRemoveImage}
                sx={{
                  color: '#ef4444',
                  '&:hover': { backgroundColor: 'rgba(239,68,68,0.08)' },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ) : (
        /* ── Drag & drop upload zone ── */
        <label htmlFor={uniqueId}>
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              py: 4,
              px: 3,
              borderRadius: 3,
              cursor: 'pointer',
              border: `2px dashed ${
                isDragOver
                  ? theme.palette.primary.main
                  : isDark
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(0,0,0,0.12)'
              }`,
              backgroundColor: isDragOver
                ? isDark ? 'rgba(56,189,248,0.05)' : 'rgba(15,138,175,0.03)'
                : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              },
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(15,138,175,0.08)',
              }}
            >
              <CloudUploadIcon
                sx={{
                  fontSize: 26,
                  color: isDark ? '#38bdf8' : '#0f8aaf',
                }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: isDark ? '#d1d5db' : '#374151',
                  mb: 0.3,
                }}
              >
                Drag & drop an image here, or click to browse
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? '#6b7280' : '#9ca3af',
                  fontSize: '0.75rem',
                }}
              >
                Supports JPG, PNG, GIF, WebP • Max 5MB
              </Typography>
            </Box>
          </Box>
        </label>
      )}
    </Box>
  );
}
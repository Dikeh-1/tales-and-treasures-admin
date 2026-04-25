import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  DialogActions,
  Button,
  Chip,
  useTheme,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloseIcon from '@mui/icons-material/Close';

export default function NewsletterDetailsModal({ open, onClose, newsletter }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!newsletter) return null;

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
        },
      }}
    >
      {/* Premium header */}
      <DialogTitle
        sx={{
          fontWeight: 800,
          fontSize: '1.3rem',
          background: isDark
            ? 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
            : 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
          color: '#ffffff',
          py: 2.5,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.3,
              pr: 2,
            }}
          >
            {newsletter.subject}
          </Typography>
        </Box>
        {newsletter.sentAt && (
          <Chip
            icon={<CalendarTodayIcon sx={{ fontSize: 14, color: '#d4af37 !important' }} />}
            label={new Date(newsletter.sentAt).toLocaleString()}
            size="small"
            sx={{
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#d8f3dc',
              fontWeight: 500,
              fontSize: '0.75rem',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          px: 3,
          py: 3,
          backgroundColor: isDark ? '#0f1d33' : '#ffffff',
        }}
      >
        {/* Hero image with premium treatment */}
        {newsletter.mediaUrl && (
          <Box
            sx={{
              mb: 3,
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.08)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
            }}
          >
            <Box
              component="img"
              src={newsletter.mediaUrl}
              alt="Newsletter media"
              sx={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </Box>
        )}

        {/* Content area */}
        <Box
          sx={{
            mt: 2,
            '& ul, & ol': { pl: 3, mb: 2 },
            '& p': {
              mb: 2,
              color: isDark ? '#e2e8f0' : '#1f2937',
              lineHeight: 1.75,
            },
            '& h1, & h2, & h3': {
              color: isDark ? '#f1f5f9' : '#111827',
              fontWeight: 700,
              mb: 1,
            },
            '& li': {
              color: isDark ? '#d1d5db' : '#374151',
              mb: 0.5,
            },
            '& a': {
              color: isDark ? '#38bdf8' : '#2d6a4f',
              fontWeight: 500,
            },
            '& strong, & b': {
              color: isDark ? '#f1f5f9' : '#111827',
            },
            fontSize: '1rem',
            lineHeight: 1.75,
            color: isDark ? '#e2e8f0' : '#1f2937',
          }}
          dangerouslySetInnerHTML={{ __html: newsletter.content }}
        />
      </DialogContent>

      <DialogActions
        sx={{
          p: 2.5,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          startIcon={<CloseIcon />}
          sx={{
            borderRadius: 2,
            fontWeight: 600,
            px: 3,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
            color: isDark ? '#d1d5db' : '#4b5563',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
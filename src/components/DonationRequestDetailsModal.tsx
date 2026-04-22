import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BookIcon from '@mui/icons-material/Book';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';

export type DonationRequestDetails = {
  id: number;
  requestType: 'Book' | 'Other';
  name: string;
  email?: string;
  phone: string;
  status: string;
  createdAt: string;
  summary: string;
  description?: string;
  bookQty?: number;
  bookCondition?: string;
  deliveryMethod?: string;
  pickupAddress?: string;
  contributionType?: string;
};

interface DonationRequestDetailsModalProps {
  open: boolean;
  onClose: () => void;
  request: DonationRequestDetails | null;
  onApprove: () => void;
  onReject: () => void;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBanner({ status }: { status: string }) {
  if (status === 'Approved') {
    return (
      <Box
        sx={{
          mb: 4,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'success.light',
          bgcolor: 'success.lighter',
          color: 'success.dark',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography fontWeight={600}>Current Status: Approved</Typography>
        <CheckCircleIcon />
      </Box>
    );
  }

  if (status === 'Rejected') {
    return (
      <Box
        sx={{
          mb: 4,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'error.light',
          bgcolor: 'error.lighter',
          color: 'error.dark',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography fontWeight={600}>Current Status: Rejected</Typography>
        <CancelIcon />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mb: 4,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'warning.light',
        bgcolor: 'warning.lighter',
        color: 'warning.dark',
      }}
    >
      <Typography fontWeight={600}>Current Status: Pending</Typography>
    </Box>
  );
}

export default function DonationRequestDetailsModal({
  open,
  onClose,
  request,
  onApprove,
  onReject,
}: DonationRequestDetailsModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!request) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
          <Avatar
            sx={{
              bgcolor: request.requestType === 'Book' ? 'primary.light' : 'secondary.light',
              color: request.requestType === 'Book' ? 'primary.main' : 'secondary.main',
            }}
          >
            {request.requestType === 'Book' ? <BookIcon /> : <CategoryIcon />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {request.requestType} Donation Request
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: #{request.id} • {formatDate(request.createdAt)}
            </Typography>
          </Box>
        </Box>
        <IconButton aria-label="close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        <StatusBanner status={request.status} />

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
              DONATION DETAILS
            </Typography>
            <Box
              sx={{
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {request.summary}
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Type:
                  </Typography>
                  <Chip label={request.requestType} size="small" color="primary" />
                </Box>

                {request.requestType === 'Book' && (
                  <>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Quantity:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {request.bookQty ?? 0}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Condition:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {request.bookCondition || 'Not provided'}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Delivery:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {request.deliveryMethod || 'Not provided'}
                      </Typography>
                    </Box>
                    {request.deliveryMethod === 'pickup' && (
                      <>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Pickup Address:
                          </Typography>
                          <Typography variant="body2" fontWeight={600} textAlign="right">
                            {request.pickupAddress || 'Not provided'}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </>
                )}

                {request.requestType === 'Other' && (
                  <>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Contribution Type:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {request.contributionType || 'Not provided'}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
              DONOR DETAILS
            </Typography>
            <Box
              sx={{
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="body1" fontWeight={600}>
                    {request.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    <PhoneIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="body1">{request.phone || 'Not provided'}</Typography>
                </Box>
                {request.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      <EmailIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="body1">{request.email}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
              ADDITIONAL NOTES
            </Typography>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {request.description || 'No additional notes provided.'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: `1px solid ${theme.palette.divider}`,
          justifyContent: 'space-between',
        }}
      >
        <Button onClick={onClose} size="large" sx={{ borderRadius: 2, color: 'text.secondary' }}>
          Close
        </Button>

        {request.status === 'Pending' && (
          <Stack direction="row" spacing={2}>
            <Button
              onClick={onReject}
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              sx={{ borderRadius: 2 }}
            >
              Reject
            </Button>
            <Button
              onClick={onApprove}
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              sx={{ borderRadius: 2 }}
            >
              Approve Request
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
}


import { Card, Typography, Box, Avatar, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
}

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  const theme = useTheme();

  return (
    <Card
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        p: 3,
        height: '100%',
        width: '100%',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      {/* Decorative Background Circle */}
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.1,
          zIndex: 0,
        }}
      />

      <Avatar
        variant="rounded"
        sx={{
          bgcolor: `${color}22`, // 22 is hex for ~13% opacity
          color: color,
          width: { xs: 48, sm: 56 },
          height: { xs: 48, sm: 56 },
          mr: 2.5,
          zIndex: 1,
          borderRadius: 3,
          flexShrink: 0,
        }}
      >
        {icon}
      </Avatar>

      <Box sx={{ zIndex: 1, minWidth: 0, flex: 1 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight={600}
          sx={{
            mb: 0.5,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            lineHeight: 1.3,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="h4"
          fontWeight={800}
          color="text.primary"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.6rem', md: '1.9rem' },
            lineHeight: 1.15,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Card>
  );
}

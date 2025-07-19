import React, { useState, useEffect } from 'react';
import apiClient from "./utils/apiAuth";
import { Box, Typography, Grid, Paper, TextField, Button, List, ListItem, ListItemText, Snackbar, Modal, IconButton,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import CommentIcon from '@mui/icons-material/Comment';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";

interface Comment {
  id: string;
  comment: string;
  timestamp: Date;
  role: 'trainer' | 'student';
}

interface Bug {
  sl_id: string;
  BugDescription: string;
  Img_path: string;
  Comments: Record<string, { comment: string; timestamp: string; role: 'trainer' | 'student' }>;
}

interface DetailPanelProps {
  row: { original: Bug };
  onCommentAdded?: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ row, onCommentAdded }) => {
  const bug = row.original;
  const [comment, setComment] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
 
const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  useEffect(() => {
    if (bug.Comments) {
      const sortedComments = Object.entries(bug.Comments)
        .map(([key, value]) => ({
          id: key,
          comment: value.comment,
          timestamp: new Date(value.timestamp),
          role: value.role,
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setComments(sortedComments);
    }
  }, [bug.Comments]);

  const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setComment(event.target.value);
  };

  const handleSendComment = async () => {
    if (!comment.trim()) {
      setSnackbarMessage('Comment cannot be empty');
      setSnackbarOpen(true);
      return;
    }
  
    setLoading(true);
  const url=`${process.env.REACT_APP_BACKEND_URL}api/student/ticket/comments/`
    try {
      const response = await apiClient.put(
        url,
        {
          student_id: studentId,
          comment: comment,
          t_id: bug.sl_id
        }
      );
  
      if (response.data && response.data.message) {
        const newComments = Object.entries(response.data.message).map(([key, value]: [string, any]) => ({
          id: key,
          comment: value.comment,
          timestamp: new Date(value.timestamp),
          role: value.role,
        })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
        setComments(newComments);
        setSnackbarMessage('Comment added successfully');
      } else {
        setSnackbarMessage('Comment added but no updated data received');
      }
      
      setSnackbarOpen(true);
      setComment('');
  
      if (onCommentAdded) {
        onCommentAdded();
      }
    } 
    catch (innerError: any) {
      setSnackbarMessage('Error sending comment');
      setSnackbarOpen(true);console.error("Error fetching Detail panel data:", innerError);
            }
finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
          
            <Typography variant="body1" paragraph sx={{ fontSize: '0.9rem', mb: 2 }}>
              <strong>Description:</strong> {bug.BugDescription}
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={bug.Img_path}
                alt="Issue Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  cursor: 'pointer',
                }}
                onClick={() => setImageModalOpen(true)}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <CommentIcon sx={{ mr: 1 }} />
              Comments
            </Typography>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '200px', mb: 2 }}>
              <List>
                {comments.map((comment, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      justifyContent:
                        comment.role === 'trainer' ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <Paper
                      elevation={2}
                      sx={{
                        p: 0.1,
                        maxWidth: '70%',
                        backgroundColor: comment.role === 'trainer' ? '#e3f2fd' : '#f1f8e9',
                      }}
                    >
                      <ListItemText
                        primary={<pre>{comment.comment}</pre>}
                        secondary={format(comment.timestamp, 'MMM dd, yyyy HH:mm')}
                        primaryTypographyProps={{
                          variant: 'caption',
                          color: 'textPrimary',
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          color: 'textSecondary',
                        }}
                      />
                    </Paper>
                  </ListItem>
                ))}
              </List>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              placeholder="Your comment"
              value={comment}
              onChange={handleCommentChange}
              sx={{ mb: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendComment}
              fullWidth
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Add Comment'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
      <Modal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        aria-labelledby="image-modal"
        aria-describedby="full-size-issue-image"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <IconButton
            aria-label="close"
            onClick={() => setImageModalOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img
              src={bug.Img_path}
              alt="Full Size Issue"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default DetailPanel;

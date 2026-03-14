import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import './InterviewRecorder.css';

export interface RecordingData {
  recordingUrl: string;
  recordingDuration: number;
  recordingSize: number;
  recordingType: 'video' | 'audio';
}

interface InterviewRecorderProps {
  isEnabled: boolean;
  onRecordingComplete: (data: RecordingData) => void;
  autoStart?: boolean;
}

export interface InterviewRecorderRef {
  stopRecording: () => void;
  stopCamera: () => void;
  isRecording: boolean;
}

const InterviewRecorder = forwardRef<InterviewRecorderRef, InterviewRecorderProps>(({
  isEnabled,
  onRecordingComplete,
  autoStart = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const autoStartTriggered = useRef<boolean>(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [recordingComplete, setRecordingComplete] = useState(false);

  // Keep recordingTime in sync with ref for use in callbacks
  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Stop camera helper function
  const stopCamera = useCallback(() => {
    console.log('🎥 Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`   Track stopped: ${track.kind}`);
      });
      streamRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    console.log('🎥 Camera stopped');
  }, []);

  // Initial camera setup
  useEffect(() => {
    if (isEnabled && hasPermission === null) {
      requestCameraPermission();
    }
    return () => {
      // Cleanup stream on unmount
      stopCamera();
    };
  }, [isEnabled, stopCamera]);

  // Auto-start recording - only trigger once
  useEffect(() => {
    if (autoStart && hasPermission && !isRecording && !recordingComplete && !autoStartTriggered.current) {
      autoStartTriggered.current = true;
      console.log('🎥 Auto-starting recording...');
      // Small delay to ensure camera is ready
      const timer = setTimeout(() => {
        startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasPermission, recordingComplete]);

  const requestCameraPermission = async () => {
    try {
      console.log('🎥 Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setHasPermission(true);
      setError('');
      console.log('🎥 Camera permission granted');
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setHasPermission(false);
      setError(err.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access to record your interview.'
        : 'Could not access camera. Please check your device settings.'
      );
    }
  };

  const startRecording = useCallback(() => {
    const stream = streamRef.current || (videoRef.current?.srcObject as MediaStream);
    
    if (!stream) {
      setError('Camera not ready. Please try again.');
      console.error('🎥 Cannot start recording: No stream available');
      return;
    }

    console.log('🎥 Starting recording...');
    chunksRef.current = [];
    
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    let mediaRecorder: MediaRecorder;
    
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      // Fallback to default
      try {
        mediaRecorder = new MediaRecorder(stream);
      } catch (e2) {
        console.error('🎥 Cannot create MediaRecorder:', e2);
        setError('Recording not supported in this browser.');
        return;
      }
    }
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        console.log(`🎥 Recording chunk received: ${e.data.size} bytes`);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('🎥 Recording stopped, processing...');
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setRecordingComplete(true);
      
      const finalDuration = recordingTimeRef.current;
      console.log(`🎥 Recording complete: ${finalDuration}s, ${blob.size} bytes`);
      
      onRecordingComplete({
        recordingUrl: url,
        recordingDuration: finalDuration,
        recordingSize: blob.size,
        recordingType: 'video'
      });
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every 1 second
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    console.log('🎥 Recording started');
  }, [onRecordingComplete]);

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = useCallback(() => {
    console.log('🎥 Stop recording requested...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      console.log('🎥 MediaRecorder stopped');
    }
  }, []);

  // Expose methods via ref for parent component
  useImperativeHandle(ref, () => ({
    stopRecording: () => {
      stopRecording();
      stopCamera();
    },
    stopCamera,
    isRecording
  }), [stopRecording, stopCamera, isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="interview-recorder">
      <div className="recorder-header">
        <div className="recorder-title">
          <span className="recorder-icon">📹</span>
          <span>Interview Recording</span>
        </div>
        {isRecording && (
          <div className={`recording-indicator ${isPaused ? 'paused' : 'active'}`}>
            <span className="recording-dot"></span>
            <span>{isPaused ? 'PAUSED' : 'REC'}</span>
            <span className="recording-time">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      <div className="video-container">
        {recordingComplete && previewUrl ? (
          <video 
            src={previewUrl} 
            className="video-preview" 
            controls
          />
        ) : (
          <video 
            ref={videoRef} 
            className="video-preview" 
            autoPlay 
            muted 
            playsInline
          />
        )}
        
        {hasPermission === false && (
          <div className="permission-overlay">
            <div className="permission-message">
              <span className="permission-icon">🎥</span>
              <p>{error}</p>
              <button onClick={requestCameraPermission} className="retry-btn">
                Request Permission
              </button>
            </div>
          </div>
        )}
      </div>

      {error && hasPermission !== false && (
        <div className="recorder-error">{error}</div>
      )}

      {hasPermission && !recordingComplete && (
        <div className="recorder-controls">
          {!isRecording ? (
            <button onClick={startRecording} className="control-btn start">
              <span className="btn-icon">⏺</span>
              Start Recording
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button onClick={pauseRecording} className="control-btn pause">
                  <span className="btn-icon">⏸</span>
                  Pause
                </button>
              ) : (
                <button onClick={resumeRecording} className="control-btn resume">
                  <span className="btn-icon">▶</span>
                  Resume
                </button>
              )}
              <button onClick={stopRecording} className="control-btn stop">
                <span className="btn-icon">⏹</span>
                Stop
              </button>
            </>
          )}
        </div>
      )}

      {recordingComplete && (
        <div className="recording-saved">
          <span className="saved-icon">✅</span>
          <span>Recording saved ({formatTime(recordingTime)})</span>
        </div>
      )}

      <div className="recorder-tips">
        <p><strong>Tips:</strong></p>
        <ul>
          <li>Ensure good lighting on your face</li>
          <li>Speak clearly and maintain eye contact with camera</li>
          <li>Recording will be saved when you complete the interview</li>
        </ul>
      </div>
    </div>
  );
});

InterviewRecorder.displayName = 'InterviewRecorder';

export default InterviewRecorder;

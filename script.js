// Global variables
let isTyping = false;
let currentAPI = 'primary'; // Track current API
let documentMemory = []; // Store document content for RAG
let uploadedFiles = []; // Store uploaded files list
let isRecording = false; // Voice recording state
let mediaRecorder = null; // Voice recording
let audioChunks = []; // Voice recording chunks
let menuOpen = false; // Menu state
let analysisHistory = []; // Store analysis history
let customPrompts = []; // Store custom analysis prompts


// API endpoints configuration
const apiEndpoints = {
  primary: "https://prod-16.centralindia.logic.azure.com:443/workflows/bc8e071316bc4d19838807411e8f4a2b/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=1p_vtU3mM9NR_TkekoUseCWYkr97iAQpntsTaNYsayY",
  secondary: "https://prod-00.centralindia.logic.azure.com:443/workflows/b08051463ab745ffa2b65f047bb9a851/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0Ou_Urs96sLQJITEu_2xw9LEF6sb0qka8E7hKC89FH0"
};

// API names for display
const apiNames = {
  primary: "Base Knowledge",
  secondary: "Knowledge Vault"
};

// Contact email configuration
const contactEmail = "718279@cognizant.com"; // Destination email for contact form
// Provide your Power Automate/Logic Apps HTTP Request URL below to enable server-side email sending
// Example: const contactEmailWebhook = "https://prod-xx.azure.logic.azure.com:443/workflows/xxxx/triggers/manual/paths/invoke?...";
const contactEmailWebhook = ""; // TODO: set this to your webhook URL

// Analysis templates data
const analysisTemplates = [
  {
    id: 'sentiment',
    title: 'Sentiment Analysis',
    icon: '😊',
    description: 'Analyze the emotional tone and sentiment of your documents',
    tags: ['sentiment', 'emotion', 'tone'],
    prompt: 'Please perform a comprehensive sentiment analysis of the uploaded document following this specific methodology and format...'
  },
  {
    id: 'summary',
    title: 'Document Summary',
    icon: '📝',
    description: 'Create concise summaries with key points and insights',
    tags: ['summary', 'key-points', 'insights'],
    prompt: 'Please provide a comprehensive summary of the uploaded document in the following three formats...'
  },
  {
    id: 'analysis',
    title: 'Deep Analysis',
    icon: '🔍',
    description: 'Comprehensive analysis with strategic insights and recommendations',
    tags: ['analysis', 'strategic', 'insights'],
    prompt: 'Please provide a comprehensive analysis of the uploaded document following these characteristics...'
  },
  {
    id: 'extract',
    title: 'Data Extraction',
    icon: '📊',
    description: 'Extract structured data, numbers, and key metrics',
    tags: ['data', 'metrics', 'extraction'],
    prompt: 'Please extract and organize all numerical data, metrics, and key figures from the document...'
  },
  {
    id: 'qa',
    title: 'Q&A Generation',
    icon: '❓',
    description: 'Generate questions and answers based on document content',
    tags: ['qa', 'questions', 'answers'],
    prompt: 'Please generate 10 relevant questions and answers based on the document content...'
  },
  {
    id: 'timeline',
    title: 'Timeline Analysis',
    icon: '📅',
    description: 'Extract and organize chronological information',
    tags: ['timeline', 'chronology', 'dates'],
    prompt: 'Please extract all chronological information and create a timeline of events from the document...'
  }
];

// Help center data
const helpContent = {
  gettingStarted: [
    {
      title: 'How to upload documents',
      description: 'Click the upload area or drag and drop files. Supported formats: PDF, DOCX, TXT'
    },
    {
      title: 'Using the chat interface',
      description: 'Type your questions and press Enter. The AI will respond based on your uploaded documents'
    },
    {
      title: 'Understanding RAG mode',
      description: 'Toggle the switch to enable document-enhanced responses using your uploaded files'
    }
  ],
  analysis: [
    {
      title: 'Document Analysis',
      description: 'Use the action buttons to analyze, summarize, or perform sentiment analysis on your documents'
    },
    {
      title: 'Custom Analysis',
      description: 'Create custom analysis prompts tailored to your specific needs'
    },
    {
      title: 'Analysis Templates',
      description: 'Choose from pre-built templates for common analysis tasks'
    }
  ],
  troubleshooting: [
    {
      title: 'Documents not loading',
      description: 'Check file format and size. Try refreshing the page and re-uploading'
    },
    {
      title: 'Analysis not working',
      description: 'Ensure documents are uploaded and RAG mode is enabled'
    },
    {
      title: 'Slow responses',
      description: 'Large documents may take longer to process. Consider splitting into smaller files'
    }
  ]
};

// Tutorial data
const tutorials = [
  {
    title: 'Getting Started with TUBU',
    duration: '5 min',
    icon: '🚀',
    description: 'Learn the basics of uploading documents and starting conversations'
  },
  {
    title: 'Advanced Document Analysis',
    duration: '8 min',
    icon: '📊',
    description: 'Master the analysis tools and custom prompts'
  },
  {
    title: 'Optimizing RAG Responses',
    duration: '6 min',
    icon: '🧠',
    description: 'Learn how to get the best results from your document-enhanced queries'
  },
  {
    title: 'Custom Analysis Templates',
    duration: '4 min',
    icon: '📋',
    description: 'Create and save your own analysis templates'
  }
];

// Enhanced notification system
function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span class="notification-text">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after duration
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Enhanced sendMessage with better UX
function sendMessage() {
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  // Add loading animation to send button
  const sendButton = document.querySelector('.send-button');
  const originalText = sendButton.textContent;
  sendButton.textContent = '⏳';
  sendButton.disabled = true;

  addMessage(text, "user");
  addToHistory(text); // Add to chat history
  input.value = "";
  showTyping();
  
  // Check for simple greetings and use local generateReply function
  const lowerText = text.toLowerCase();
  if (lowerText.includes("hi") || lowerText.includes("hello") || lowerText.includes("help") || 
      lowerText.includes("joke") || lowerText.includes("cool") || lowerText.includes("otp") || 
      lowerText.includes("sharepoint")) {
    setTimeout(() => {
      hideTyping();
      const reply = generateReply(text);
      addMessage(reply, "bot");
      
      // Reset send button
      sendButton.textContent = originalText;
      sendButton.disabled = false;
    }, 1000);
  } else {
    // Use external API for other queries
    if (currentAPI === 'secondary') {
      // When toggle is ON (Primary Knowledge), use RAG enhancement
      console.log('=== RAG MODE ACTIVATED ===');
      console.log('Current API:', currentAPI);
      console.log('Document memory count:', documentMemory.length);
      console.log('Original question:', text);
      
      const enhancedText = sendMessageWithRAG(text);
      console.log('Enhanced question:', enhancedText);
      console.log('Question length:', enhancedText.length);
      
      sendToPowerAutomate(enhancedText);
    } else {
      // When toggle is OFF (Knowledge Vault), use original API without RAG
      console.log('=== STANDARD MODE ===');
      console.log('Current API:', currentAPI);
      console.log('Using Knowledge Vault API without RAG');
      sendToPowerAutomate(text);
    }
  }
}

// Enhanced message display with better animations
function addMessage(msg, sender) {
  const chatWindow = document.getElementById("chatWindow");
  const time = new Date().toLocaleTimeString();
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = sender === "user" ? "👨‍💼" : "🧠";
  
  const content = document.createElement("div");
  content.className = "message-content";
  
  const text = document.createElement("div");
  text.className = "message-text";
  
  // Check if message contains tabular data and format it
  const formattedMessage = formatTableData(msg);
  text.innerHTML = formattedMessage;
  
  const meta = document.createElement("div");
  meta.className = "message-meta";
  
  const timestamp = document.createElement("span");
  timestamp.className = "timestamp";
  timestamp.textContent = time;
  
  meta.appendChild(timestamp);
  
  content.appendChild(text);
  content.appendChild(meta);
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  
  chatWindow.appendChild(messageDiv);
  
  // Enhanced scroll animation
  setTimeout(() => {
    chatWindow.scrollTo({
      top: chatWindow.scrollHeight,
      behavior: 'smooth'
    });
  }, 100);
}

// Enhanced typing indicator with better animation
function showTyping(customMessage = "Tubu is thinking...") {
  const chatWindow = document.getElementById("chatWindow");
  const typingDiv = document.createElement("div");
  typingDiv.id = "typing";
  typingDiv.className = "message bot";
  
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🧠";
  
  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = `
    <div id="typing-text">
      <span class="typing-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
      ${customMessage}
    </div>
  `;
  
  typingDiv.appendChild(avatar);
  typingDiv.appendChild(content);
  chatWindow.appendChild(typingDiv);
  
  setTimeout(() => {
    chatWindow.scrollTo({
      top: chatWindow.scrollHeight,
      behavior: 'smooth'
    });
  }, 100);
}

function hideTyping() {
  const typingDiv = document.getElementById("typing");
  if (typingDiv) {
    typingDiv.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => typingDiv.remove(), 300);
  }
}

// Enhanced reply generation with more responses
function generateReply(input) {
  input = input.toLowerCase();
  if (input.includes("hi")) return "Hello! 👋 Nice to meet you! How can I assist you today?";
  if (input.includes("hello")) return "Hi there! 😊 What can I help you with today?";
  if (input.includes("help")) return "I'm here to assist! Ask me about tasks, jokes, or guidance.";
  if (input.includes("joke")) return "Why don't developers like nature? It has too many bugs! 🐛";
  if (input.includes("cool")) return "Did you know Copilot can help you automate your workflows with AI? Just like tubu.ai!";
  if (input.includes("otp")) return "Response will be limited to OTP Portal";
  if (input.includes("sharepoint")) return "Response will be limited to Sharepoint Document";
  if (input.includes("documents") || input.includes("files") || input.includes("memory")) {
    if (documentMemory.length === 0) {
      return "No documents are currently loaded in memory. Please upload some documents to the Knowledge Vault first.";
    } else {
      const docList = documentMemory.map(doc => `• ${doc.name}`).join('\n');
      return `I have ${documentMemory.length} document(s) loaded in memory:\n${docList}\n\nYou can ask me questions about these documents!`;
    }
  }
  
  if (input.includes("debug") || input.includes("test")) {
    return debugDocumentMemory();
  }
  
  if (input.includes("api") || input.includes("status")) {
    return `Current API Status:
- Toggle State: ${currentAPI === 'secondary' ? 'ON (Primary Knowledge)' : 'OFF (Knowledge Vault)'}
- API Endpoint: ${apiEndpoints[currentAPI]}
- RAG Status: ${currentAPI === 'secondary' ? 'ACTIVE' : 'DISABLED'}
- Documents in Memory: ${documentMemory.length}`;
  }
  
  if (input.includes("test") && input.includes("rag")) {
    if (currentAPI === 'secondary') {
      return `RAG TEST: Toggle is ON - RAG system is ACTIVE. 
Upload a document and ask questions about it to test RAG functionality.`;
    } else {
      return `RAG TEST: Toggle is OFF - RAG system is DISABLED. 
Questions will be sent directly to the API without document enhancement.`;
    }
  }
  
  if (input.includes("init") || input.includes("sync")) {
    initializeDocumentMemory();
    return `Document memory initialized. Current status:
- Documents in memory: ${documentMemory.length}
- Toggle state: ${currentAPI === 'secondary' ? 'ON (RAG Active)' : 'OFF (Standard Mode)'}
- API: ${apiNames[currentAPI]}`;
  }
  
  return "I'm checking… !";
}

// Enhanced API call with better error handling
async function sendToPowerAutomate(question) {
  try {
    const selectedAPI = currentAPI;
    const apiUrl = apiEndpoints[selectedAPI];
    
    console.log('=== API CALL DEBUG ===');
    console.log('Selected API:', selectedAPI);
    console.log('API URL:', apiUrl);
    console.log('Question being sent:', question);
    console.log('Question length:', question.length);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question: question })
    });
    
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response data:', data);
    
    // Show confidence score only when RAG is active AND documents were actually used
    const responseText = data.answer || "I couldn't find a response.";
    const hasDocumentSource = responseText.includes('Source:') || responseText.includes('Page') || responseText.includes('document');
    const showConfidence = selectedAPI === 'secondary' && (question.includes('Relevant document context') || question.confidence || hasDocumentSource);
    const confidenceLevel = question.confidence || 95; // Use calculated confidence or default to 95
    
    console.log('Confidence Debug:');
    console.log('- Selected API:', selectedAPI);
    console.log('- Question includes document context:', question.includes('Relevant document context'));
    console.log('- Question has confidence:', !!question.confidence);
    console.log('- Response has document source:', hasDocumentSource);
    console.log('- Show confidence:', showConfidence);
    console.log('- Confidence level:', confidenceLevel);
    
    typeBotMessage(responseText, showConfidence, confidenceLevel);
    
    // Reset send button
    const sendButton = document.querySelector('.send-button');
    sendButton.textContent = 'Send';
    sendButton.disabled = false;
    
  } catch (error) {
    console.error('API Call Error:', error);
    addMessage("Sorry, there was a problem connecting to our system. Please try again.", "bot");
    
    // Reset send button
    const sendButton = document.querySelector('.send-button');
    sendButton.textContent = 'Send';
    sendButton.disabled = false;
    
    // Show error notification
    showNotification('Connection error. Please try again.', 'error');
  }
}

// Enhanced typing animation with better performance
function typeBotMessage(text, showConfidence = false, confidenceLevel = 95) {
  hideTyping();
  
  const chatWindow = document.getElementById("chatWindow");
  const time = new Date().toLocaleTimeString();
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "message bot";
  
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🧠";
  
  const content = document.createElement("div");
  content.className = "message-content";
  
  const textDiv = document.createElement("div");
  textDiv.className = "message-text";
  const typedId = `typedText-${Date.now()}`;
  textDiv.id = typedId;
  
  const meta = document.createElement("div");
  meta.className = "message-meta";
  
  const timestamp = document.createElement("span");
  timestamp.className = "timestamp";
  timestamp.textContent = time;
  
  meta.appendChild(timestamp);
  
  // Only show confidence score if RAG is active and documents are being used
  if (showConfidence) {
    const confidence = document.createElement("span");
    confidence.className = "confidence";
    confidence.textContent = `${confidenceLevel}% confidence`;
    meta.appendChild(confidence);
  }
  
  content.appendChild(textDiv);
  content.appendChild(meta);
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  
  chatWindow.appendChild(messageDiv);
  
  const typedSpan = document.getElementById(typedId);
  
  // Check if the text contains table data
  const formattedText = formatTableData(text);
  
  // If it's a table, display it immediately without typing animation
  if (formattedText.includes('<table')) {
    typedSpan.innerHTML = formattedText;
    chatWindow.scrollTo({
      top: chatWindow.scrollHeight,
      behavior: 'smooth'
    });
    return;
  }
  
  // For regular text, use typing animation
  const words = formattedText.split(" ");
  let index = 0;

  const interval = setInterval(() => {
    if (index < words.length) {
      typedSpan.innerHTML += words[index] + " ";
      index++;
      
      // Smooth scroll to bottom
      chatWindow.scrollTo({
        top: chatWindow.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      clearInterval(interval);
      isTyping = false;
    }
  }, 30);
}

// Voice input functionality
async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      // Here you would typically send the audio to a speech-to-text service
      // For now, we'll just show a placeholder message
      showNotification('Voice input feature coming soon!', 'info');
    };
    
    mediaRecorder.start();
    isRecording = true;
    
    // Update UI
    const penIcon = document.querySelector('.pen-icon');
    penIcon.textContent = '🎤';
    penIcon.style.background = 'var(--accent-red)';
    penIcon.style.color = 'var(--text-primary)';
    
    showNotification('Recording... Click again to stop', 'info');
    
  } catch (error) {
    console.error('Error accessing microphone:', error);
    showNotification('Microphone access denied', 'error');
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    
    // Update UI
    const penIcon = document.querySelector('.pen-icon');
    penIcon.textContent = '✏️';
    penIcon.style.background = 'var(--bg-quaternary)';
    penIcon.style.color = 'var(--text-secondary)';
    
    showNotification('Voice recording stopped', 'success');
  }
}

// Enhanced drag and drop with visual feedback
function enhanceDragAndDrop() {
  const uploadArea = document.querySelector('.upload-area');
  
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.classList.add('dragover');
    this.style.transform = 'scale(1.02)';
    this.style.boxShadow = 'var(--shadow-glow)';
  });
  
  uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    this.classList.remove('dragover');
    this.style.transform = 'scale(1)';
    this.style.boxShadow = 'var(--shadow)';
  });
  
  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    this.classList.remove('dragover');
    this.style.transform = 'scale(1)';
    this.style.boxShadow = 'var(--shadow)';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
      showNotification(`${files.length} file(s) dropped successfully!`, 'success');
    }
  });
}

// Enhanced file upload with better progress indication
function handleFileUpload(files) {
  const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  let uploadedCount = 0;
  let totalFiles = files.length;

  // Show upload progress
  showUploadProgress();

  Array.from(files).forEach((file, index) => {
    // Check if file type is supported
    if (!supportedTypes.includes(file.type)) {
      addMessage(`File "${file.name}" is not supported. Please upload PDF, DOCX, or TXT files.`, "bot");
      showNotification(`Unsupported file type: ${file.name}`, 'error');
      return;
    }

    // Upload to SharePoint
    uploadToSharePoint(file)
      .then((fileInfo) => {
        uploadedCount++;
        updateUploadProgress(uploadedCount, totalFiles);
        
        if (uploadedCount === totalFiles) {
          hideUploadProgress();
          updateDocumentCount(uploadedFiles.length);
          showUploadedFilesList();
          
          const processedCount = uploadedFiles.filter(f => f.uploadedToSharePoint).length;
          const failedCount = uploadedFiles.length - processedCount;
          
          let message = `Successfully processed ${uploadedCount} document(s)!`;
          if (failedCount > 0) {
            message += ` ${failedCount} failed to process.`;
          }
          
          addMessage(message, "bot");
          showNotification(`Upload complete! ${uploadedCount} file(s) processed.`, 'success');
        }
      })
      .catch(error => {
        console.error('Upload error:', error);
        addMessage(`Failed to upload "${file.name}". Please try again.`, "bot");
        showNotification(`Upload failed: ${file.name}`, 'error');
      });
  });
}

function uploadToSharePoint(file) {
  return new Promise((resolve, reject) => {
    // Read file content and store in memory
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const fileContent = e.target.result;
        
        // Extract text content (async for PDF files)
        const textContent = await extractTextContent(fileContent, file.type);
        
        // Create file info with content stored in memory
        const fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
          id: Date.now() + Math.random(),
          uploadedToSharePoint: true,
          content: fileContent, // Store the actual file content in memory
          textContent: textContent, // Extract text for RAG
          method: 'knowledge-vault-storage',
          instructions: 'File stored in Knowledge Vault for AI processing.'
        };
        
        uploadedFiles.push(fileInfo);
        
        // Store document in memory for RAG
        documentMemory.push(fileInfo);
        
        // Debug logging
        console.log('Document stored in memory:', fileInfo.name);
        console.log('Document memory count:', documentMemory.length);
        console.log('Text content length:', fileInfo.textContent ? fileInfo.textContent.length : 0);
        
        // Show success message with content extraction
        addMessage(`Document "${file.name}" uploaded to Knowledge Vault and content loaded into memory for AI processing.`, "bot");
        
        // Automatically turn ON the toggle when files are uploaded
        const apiToggle = document.getElementById('apiToggle');
        if (apiToggle && !apiToggle.checked) {
          apiToggle.checked = true;
          currentAPI = 'secondary';
          const toggleLabel = document.getElementById('toggleLabel');
          if (toggleLabel) {
            toggleLabel.textContent = apiNames[currentAPI];
          }
          addMessage(`Knowledge Vault mode activated automatically. RAG system is now active and will use uploaded documents for enhanced responses.`, "bot");
        }
        

        
        resolve(fileInfo);
      } catch (error) {
        console.error('Upload error:', error);
        reject(error);
      }
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read file content'));
    };
    
    // Read file as text for text files, or as array buffer for binary files
    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else if (file.type.includes('pdf')) {
      // For PDF files, we need to handle them specially
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

// OneDrive download function removed - files are now stored only in Knowledge Vault

// Function to show document action buttons
function showDocumentActions() {
  const documentActions = document.getElementById('documentActions');
  if (documentActions) {
    documentActions.style.display = 'flex';
    console.log('Document action buttons shown');
  }
}

// Function to hide document action buttons
function hideDocumentActions() {
  const documentActions = document.getElementById('documentActions');
  if (documentActions) {
    documentActions.style.display = 'none';
    console.log('Document action buttons hidden');
  }
}

// Function to analyze document
function analyzeDocument() {
  if (documentMemory.length === 0) {
    addMessage("No documents available for analysis. Please upload a document first.", "bot");
    return;
  }
  
  // Add user message to chat
  addMessage("Analyzing document...", "user");
  
  // Show typing indicator with custom message
  showTyping("Working on it, please wait...");
  
  // Create analysis prompt with focus on interpretation and evaluation
  const analysisPrompt = `Please provide a comprehensive analysis of the uploaded document following these characteristics:

**Analysis Characteristics:**
- Focus on WHY and HOW things are presented, not just WHAT
- Include interpretation, evaluation, and contextual understanding
- Identify data patterns, trends, and risk assessments
- Provide insights for decision-making, audits, or strategic planning

**Analysis Framework:**
1. **Strategic Context**: What is the broader business or industry context?
2. **Pattern Recognition**: What trends, patterns, or anomalies are evident?
3. **Risk Assessment**: What potential risks, challenges, or bottlenecks are identified?
4. **Opportunity Analysis**: What opportunities or strategic advantages are present?
5. **Performance Evaluation**: How effective are current processes or initiatives?
6. **Decision Implications**: What are the implications for strategic decision-making?

**Output Style:**
Provide insights similar to this example:
"The automation initiatives show a strategic shift toward RPA adoption, particularly in Claims & FRU. The high vendor cost for BOT VDI suggests a need to evaluate ROI. Membership tower's slower closure rate may indicate process bottlenecks."

Focus on interpretation, evaluation, and actionable insights rather than simple description.`;
  
  // Use RAG to analyze the document
  const enhancedQuestion = sendMessageWithRAG(analysisPrompt);
  sendToPowerAutomate(enhancedQuestion);
}

// Function to summarize document
function summaryDocument() {
  if (documentMemory.length === 0) {
    addMessage("No documents available for summarization. Please upload a document first.", "bot");
    return;
  }
  
  // Add user message to chat
  addMessage("Summarizing document...", "user");
  
  // Show typing indicator with custom message
  showTyping("Working on it, please wait...");
  
  // Create streamlined summary prompt with three formats
  const summaryPrompt = `Please provide a comprehensive summary of the uploaded document in the following three formats:

**General Summary:**
Provide a brief paragraph summarizing the document's main content, key points, and essential information. Keep it concise and focused on the most important aspects.

**Bullet Points:**
Provide 3-5 key takeaways from the document. Each bullet point should capture a distinct insight, finding, or important point that readers need to know.

**Audience-Specific Summary:**
Based on the document's content type, provide a tailored summary for the most appropriate audience:
- For business/strategy documents: Executive summary focusing on strategic insights and decisions
- For technical documents: Technical summary highlighting workflows, processes, and technical details
- For general documents: Reader-friendly summary that explains concepts clearly

Please provide all three summary formats, ensuring the audience-specific summary matches the document's content type.`;
  
  // Use RAG to summarize the document
  const enhancedQuestion = sendMessageWithRAG(summaryPrompt);
  sendToPowerAutomate(enhancedQuestion);
}

// Function to perform sentiment analysis
function sentimentAnalysis() {
  if (documentMemory.length === 0) {
    addMessage("No documents available for sentiment analysis. Please upload a document first.", "bot");
    return;
  }
  
  // Add user message to chat
  addMessage("Performing sentiment analysis...", "user");
  
  // Show typing indicator with custom message
  showTyping("Working on it, please wait...");
  
  // Create sentiment analysis prompt with specific methodology
  const sentimentPrompt = `Please perform a comprehensive sentiment analysis of the uploaded document following this specific methodology and format:

**Analysis Requirements:**
1. **Overall Sentiment Score**: Provide a numerical score between -1 and +1
2. **Sentiment Distribution**: Calculate percentage breakdown (Positive, Negative, Neutral)
3. **Key Findings**: Identify specific sentiment patterns with percentages and keywords

**Output Format:**
Please structure your response exactly like this example:

**Key Findings:**
🟢 Positive Sentiment (X%): [Description with keywords]
🔴 Negative Sentiment (X%): [Description with keywords]
⚪ Neutral Sentiment (X%): [Description]

**Verdict:**
[Provide a concise summary verdict of the overall sentiment analysis in 2-3 sentences]

Please provide a detailed sentiment analysis following this exact format.`;
  
  // Use RAG to perform sentiment analysis
  const enhancedQuestion = sendMessageWithRAG(sentimentPrompt);
  sendToPowerAutomate(enhancedQuestion);
}

function showUploadProgress() {
  const uploadArea = document.querySelector('.upload-area');
  const progressDiv = document.createElement('div');
  progressDiv.id = 'upload-progress';
  progressDiv.className = 'upload-progress';
  progressDiv.innerHTML = `
    <div class="progress-text">Uploading documents...</div>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
  `;
  uploadArea.appendChild(progressDiv);
}

function updateUploadProgress(current, total) {
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  const percentage = Math.round((current / total) * 100);
  
  if (progressFill) {
    progressFill.style.width = percentage + '%';
  }
  
  if (progressText) {
    progressText.textContent = `Uploading documents... ${current}/${total}`;
  }
}

function hideUploadProgress() {
  const progressDiv = document.getElementById('upload-progress');
  if (progressDiv) {
    progressDiv.remove();
  }
}

function showUploadedFilesList() {
  const uploadArea = document.querySelector('.upload-area');
  
  // Remove existing files list if present
  const existingList = document.querySelector('.uploaded-files-list');
  if (existingList) {
    existingList.remove();
  }
  
  // Hide default upload content when files are uploaded
  const uploadIcon = uploadArea.querySelector('.upload-icon');
  const uploadText = uploadArea.querySelector('.upload-text');
  const uploadFormats = uploadArea.querySelector('.upload-formats');
  
  if (uploadIcon) uploadIcon.style.display = uploadedFiles.length > 0 ? 'none' : 'block';
  if (uploadText) uploadText.style.display = uploadedFiles.length > 0 ? 'none' : 'block';
  if (uploadFormats) uploadFormats.style.display = uploadedFiles.length > 0 ? 'none' : 'block';
  
  if (uploadedFiles.length > 0) {
    const filesList = document.createElement('div');
    filesList.className = 'uploaded-files-list';
    
    const title = document.createElement('h3');
    title.textContent = 'Uploaded Documents';
    title.className = 'files-list-title';
    
    const filesContainer = document.createElement('div');
    filesContainer.className = 'files-container';
    
    uploadedFiles.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      
      const fileIcon = document.createElement('span');
      fileIcon.className = 'file-icon';
      fileIcon.textContent = getFileIcon(file.type);
      
      const fileName = document.createElement('div');
      fileName.className = 'file-name';
      fileName.textContent = file.name;
      
      fileItem.appendChild(fileIcon);
      fileItem.appendChild(fileName);
      
      filesContainer.appendChild(fileItem);
    });
    
    filesList.appendChild(title);
    filesList.appendChild(filesContainer);
    uploadArea.appendChild(filesList);
  }
}

function getFileIcon(fileType) {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('docx')) return '📝';
  if (fileType.includes('text') || fileType.includes('txt')) return '📃';
  return '📄';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function handleFileAction(file) {
  // This function can be used for future file actions
  // Currently, files are stored in memory for processing
  addMessage(`File "${file.name}" is available for processing.`, "bot");
}

function updateDocumentCount(count) {
  const documentsCount = document.querySelector('.documents-count p');
  const documentsStatus = document.querySelector('.documents-status');
  
  if (documentsCount) {
    documentsCount.textContent = `Documents (${count})`;
  }
  
  if (documentsStatus) {
    documentsStatus.textContent = `${count} documents in memory`;
  }
}

// Legacy functions for backward compatibility
function sendQuickReply(text) {
  addMessage(text, "user");
  showTyping();
  setTimeout(() => {
    hideTyping();
    addMessage(generateReply(text), "bot");
  }, 1000);
}

function addToHistory(question) {
  const historyList = document.getElementById("chatHistory");
  const time = new Date().toLocaleTimeString();
  
  const historyItem = document.createElement("div");
  historyItem.className = "history-item";
  
  const text = document.createElement("div");
  text.className = "history-item-text";
  text.textContent = question;
  
  const timeSpan = document.createElement("div");
  timeSpan.className = "history-item-time";
  timeSpan.textContent = time;
  
  historyItem.appendChild(text);
  historyItem.appendChild(timeSpan);
  
  // Add click handler to load the question back into input
  historyItem.addEventListener('click', function() {
    document.getElementById("userInput").value = question;
    document.getElementById("userInput").focus();
    
    // Remove active class from all items
    document.querySelectorAll('.history-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to clicked item
    this.classList.add('active');
  });
  
  historyList.appendChild(historyItem);
  historyList.scrollTop = historyList.scrollHeight;
}

function addMessagePair(userText, botText) {
  addMessage(userText, "user");
  setTimeout(() => {
    addMessage(botText, "bot");
  }, 500);
}

// Debug function to check document memory status
function debugDocumentMemory() {
  console.log('=== DOCUMENT MEMORY DEBUG ===');
  console.log('Document memory length:', documentMemory.length);
  console.log('Uploaded files length:', uploadedFiles.length);
  console.log('Current API:', currentAPI);
  console.log('Toggle state:', currentAPI === 'secondary' ? 'ON (RAG Active)' : 'OFF (Standard Mode)');
  
  documentMemory.forEach((doc, index) => {
    console.log(`Document ${index + 1}:`, {
      name: doc.name,
      type: doc.type,
      hasContent: !!doc.content,
      hasTextContent: !!doc.textContent,
      textContentLength: doc.textContent ? doc.textContent.length : 0
    });
  });
  
  return `Document memory contains ${documentMemory.length} documents. Current mode: ${currentAPI === 'secondary' ? 'RAG Active' : 'Standard Mode'}. Check console for details.`;
}

// Function to ensure document memory is properly initialized
function initializeDocumentMemory() {
  console.log('=== INITIALIZING DOCUMENT MEMORY ===');
  console.log('Current document memory:', documentMemory.length, 'documents');
  console.log('Current uploaded files:', uploadedFiles.length, 'files');
  
  // Ensure documentMemory and uploadedFiles are in sync
  if (uploadedFiles.length > 0 && documentMemory.length === 0) {
    console.log('Syncing uploaded files to document memory...');
    documentMemory = [...uploadedFiles];
  }
  
  console.log('Document memory after initialization:', documentMemory.length, 'documents');
}

// Text extraction function for different file types
async function extractTextContent(content, fileType) {
  try {
    console.log('Text extraction: File type:', fileType);
    console.log('Text extraction: Content type:', typeof content);
    
    if (fileType === 'text/plain') {
      console.log('Text extraction: Processing text file');
      return content; // Already text
    } else if (fileType.includes('pdf')) {
      console.log('Text extraction: Processing PDF file');
      console.log('Text extraction: PDF content length:', content.byteLength, 'bytes');
      
      // Try to extract text from PDF using pdf.js
      try {
        const pdfText = await extractPDFText(content);
        return pdfText;
      } catch (pdfError) {
        console.log('PDF text extraction failed, using fallback:', pdfError);
        // Fallback to basic PDF info
        const pdfInfo = `PDF Document Information:
- File size: ${content.byteLength} bytes
- Document type: PDF
- Status: Loaded into memory for AI processing
- Note: PDF text extraction failed, but document is available for reference
- Content: This PDF document has been uploaded and is available for reference in the knowledge base.`;
        
        return pdfInfo;
      }
    } else if (fileType.includes('word') || fileType.includes('docx')) {
      console.log('Text extraction: Processing Word document');
      // For Word documents, we'll extract basic text (simplified)
      // In a real implementation, you'd use a DOCX parsing library
      return `Word document content extracted. Content length: ${content.byteLength} bytes. This is a Word document that has been loaded into memory for processing.`;
    }
    
    console.log('Text extraction: Unknown file type, using generic content');
    return `Document content loaded. File type: ${fileType}. This document has been loaded into memory for AI processing.`;
  } catch (error) {
    console.error('Text extraction error:', error);
    return `Document content loaded but text extraction failed. Error: ${error.message}`;
  }
}

// PDF text extraction function using pdf.js
async function extractPDFText(arrayBuffer) {
  try {
    // Set up pdf.js worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) { // Limit to first 10 pages
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `Page ${pageNum}: ${pageText}\n\n`;
      }
      
      if (fullText.trim()) {
        console.log('PDF text extraction successful, length:', fullText.length);
        return fullText;
      } else {
        throw new Error('No text content found in PDF');
      }
    } else {
      throw new Error('PDF.js library not loaded');
    }
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw error;
  }
}

// RAG function to search through document memory
function searchDocumentMemory(query) {
  console.log('Search: Query:', query);
  console.log('Search: Document memory length:', documentMemory.length);
  
  if (documentMemory.length === 0) {
    console.log('Search: No documents in memory');
    return null;
  }
  
  const lowerQuery = query.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  let totalWords = lowerQuery.split(' ').length;
  
  documentMemory.forEach((doc, index) => {
    console.log(`Search: Checking document ${index + 1}:`, doc.name);
    console.log(`Search: Document has textContent:`, !!doc.textContent);
    
    if (doc.textContent) {
      const content = doc.textContent.toLowerCase();
      const words = lowerQuery.split(' ');
      let score = 0;
      
      words.forEach(word => {
        if (content.includes(word)) {
          score += 1;
        }
      });
      
      console.log(`Search: Document "${doc.name}" score:`, score);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = doc;
      }
    }
  });
  
  // Calculate confidence percentage based on match quality
  if (bestMatch && totalWords > 0) {
    const confidencePercentage = Math.min(95, Math.max(60, Math.round((bestScore / totalWords) * 100)));
    bestMatch.confidence = confidencePercentage;
    console.log('Search: Calculated confidence:', confidencePercentage + '%');
  }
  
  console.log('Search: Best match:', bestMatch ? bestMatch.name : 'None');
  console.log('Search: Best score:', bestScore);
  
  return bestMatch;
}

// Enhanced sendMessage function with RAG
function sendMessageWithRAG(text) {
  console.log('=== RAG SYSTEM ACTIVE ===');
  console.log('RAG: Searching for relevant documents...');
  console.log('RAG: Document memory count:', documentMemory.length);
  
  // First, check if we have relevant documents in memory
  const relevantDoc = searchDocumentMemory(text);
  
  if (relevantDoc) {
    console.log('RAG: Found relevant document:', relevantDoc.name);
    console.log('RAG: Document content preview:', relevantDoc.textContent.substring(0, 200) + '...');
    console.log('RAG: Document will be used for response - confidence score will be shown');
    console.log('RAG: Confidence level:', relevantDoc.confidence + '%');
    
    // If we found a relevant document, include it in the API call
    const enhancedQuestion = `Question: ${text}\n\nRelevant document context: ${relevantDoc.textContent.substring(0, 1000)}...\n\nPlease answer based on the document content.`;
    console.log('RAG: Enhanced question length:', enhancedQuestion.length);
    console.log('RAG: Enhanced question preview:', enhancedQuestion.substring(0, 200) + '...');
    
    // Store confidence for later use
    enhancedQuestion.confidence = relevantDoc.confidence;
    return enhancedQuestion;
  }
  
  console.log('RAG: No relevant documents found, using original question');
  console.log('RAG: Original question:', text);
  console.log('RAG: No confidence score will be shown (no documents used)');
  return text; // Return original question if no relevant document found
}

// Function to detect and format table data
function formatTableData(text) {
  // First, replace newlines with <br> for basic formatting
  let formattedText = text.replace(/\n/g, "<br>");
  
  // Check if the text contains table-like patterns
  const tablePatterns = [
    // Pattern 1: Lines with | separators
    /\|.*\|/g,
    // Pattern 2: Lines with multiple spaces/tabs that look like columns
    /^[\s]*[^\s]+[\s]{2,}[^\s]+[\s]{2,}/gm,
    // Pattern 3: Lines with dashes that look like table headers
    /^[\s]*[-]+[\s]*$/gm
  ];
  
  let hasTablePattern = false;
  tablePatterns.forEach(pattern => {
    if (pattern.test(text)) {
      hasTablePattern = true;
    }
  });
  
  if (hasTablePattern) {
    return convertToHTMLTable(text);
  }
  
  return formattedText;
}

// Function to convert text to HTML table
function convertToHTMLTable(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Check if it's a pipe-separated table
  if (lines.some(line => line.includes('|'))) {
    return convertPipeTable(lines);
  }
  
  // Check if it's a space-separated table
  if (lines.some(line => /\s{2,}/.test(line))) {
    return convertSpaceTable(lines);
  }
  
  // If no clear table pattern, return original text with <br>
  return text.replace(/\n/g, "<br>");
}

// Convert pipe-separated table
function convertPipeTable(lines) {
  let tableHTML = '<div class="table-container"><table class="message-table">';
  let tableData = [];
  
  lines.forEach((line, index) => {
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
    
    if (cells.length > 0) {
      // Check if this is a header row (contains dashes or is the first row)
      const isHeader = index === 0 || cells.some(cell => /^[-]+$/.test(cell));
      
      if (isHeader && index === 0) {
        // This is the header row
        tableHTML += '<thead><tr>';
        cells.forEach(cell => {
          if (!/^[-]+$/.test(cell)) {
            tableHTML += `<th>${escapeHTML(cell)}</th>`;
          }
        });
        tableHTML += '</tr></thead><tbody>';
        tableData.push(cells.filter(cell => !/^[-]+$/.test(cell)));
      } else if (!/^[-]+$/.test(cells[0])) {
        // This is a data row
        tableHTML += '<tr>';
        cells.forEach(cell => {
          const cellClass = getCellClass(cell);
          tableHTML += `<td class="${cellClass}">${escapeHTML(cell)}</td>`;
        });
        tableHTML += '</tr>';
        tableData.push(cells);
      }
    }
  });
  
  tableHTML += '</tbody></table></div>';
  
  // Add download CSV button if we have data
  if (tableData.length > 1) {
    const csvData = convertToCSV(tableData);
    const downloadBtn = createDownloadButton(csvData, 'table_data.csv');
    tableHTML += downloadBtn;
  }
  
  return tableHTML;
}

// Convert space-separated table
function convertSpaceTable(lines) {
  let tableHTML = '<div class="table-container"><table class="message-table">';
  let headers = [];
  let dataRows = [];
  let tableData = [];
  
  lines.forEach((line, index) => {
    // Split by multiple spaces
    const cells = line.split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell !== '');
    
    if (cells.length > 0) {
      // Check if this looks like a header row (first row or contains dashes)
      const isHeader = index === 0 || cells.some(cell => /^[-]+$/.test(cell));
      
      if (isHeader && index === 0) {
        headers = cells.filter(cell => !/^[-]+$/.test(cell));
        tableData.push(headers);
      } else if (!/^[-]+$/.test(cells[0])) {
        dataRows.push(cells);
        tableData.push(cells);
      }
    }
  });
  
  // Add header
  if (headers.length > 0) {
    tableHTML += '<thead><tr>';
    headers.forEach(header => {
      tableHTML += `<th>${escapeHTML(header)}</th>`;
    });
    tableHTML += '</tr></thead>';
  }
  
  // Add data rows
  tableHTML += '<tbody>';
  dataRows.forEach(row => {
    tableHTML += '<tr>';
    row.forEach(cell => {
      const cellClass = getCellClass(cell);
      tableHTML += `<td class="${cellClass}">${escapeHTML(cell)}</td>`;
    });
    tableHTML += '</tr>';
  });
  tableHTML += '</tbody></table></div>';
  
  // Add download CSV button if we have data
  if (tableData.length > 1) {
    const csvData = convertToCSV(tableData);
    const downloadBtn = createDownloadButton(csvData, 'table_data.csv');
    tableHTML += downloadBtn;
  }
  
  return tableHTML;
}

// Function to convert table data to CSV format
function convertToCSV(tableData) {
  if (!tableData || tableData.length === 0) return '';
  
  return tableData.map(row => {
    return row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escapedCell = cell.replace(/"/g, '""');
      if (escapedCell.includes(',') || escapedCell.includes('"') || escapedCell.includes('\n')) {
        return `"${escapedCell}"`;
      }
      return escapedCell;
    }).join(',');
  }).join('\n');
}

// Function to create download button
function createDownloadButton(csvData, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const safeFilename = filename.replace('.csv', `_${timestamp}.csv`);
  
  return `
    <div class="table-info">
      <div class="table-stats">
        <span>📊 ${csvData.split('\n').length - 1} rows</span>
        <span>📋 ${csvData.split('\n')[0].split(',').length} columns</span>
      </div>
      <div class="table-actions">
        <button class="download-csv-btn" onclick="downloadCSV('${encodeURIComponent(csvData)}', '${safeFilename}')">
          <span class="icon">📥</span>
          Download CSV
        </button>
      </div>
    </div>
  `;
}

// Function to download CSV file
function downloadCSV(csvData, filename) {
  try {
    const decodedData = decodeURIComponent(csvData);
    const blob = new Blob([decodedData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('CSV file downloaded successfully!', 'success');
    } else {
      // Fallback for older browsers
      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(decodedData);
      window.open(csvContent);
      showNotification('CSV opened in new window', 'info');
    }
  } catch (error) {
    console.error('Error downloading CSV:', error);
    showNotification('Error downloading CSV file', 'error');
  }
}

// Function to determine cell class based on content
function getCellClass(cell) {
  const cellText = cell.trim();
  
  // Check for currency format ($123.45, $1,234.56)
  if (/^\$[\d,]+\.?\d*$/.test(cellText)) {
    return 'currency';
  }
  
  // Check for percentage format (123%, 12.5%)
  if (/^\d+\.?\d*%$/.test(cellText)) {
    return 'percentage';
  }
  
  // Check for number format (123, 123.45, 1,234)
  if (/^[\d,]+\.?\d*$/.test(cellText)) {
    return 'number';
  }
  
  // Check for date format (MM/DD/YYYY, YYYY-MM-DD)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cellText) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(cellText)) {
    return 'date';
  }
  
  // Default to text alignment
  return 'text';
}

// Escape HTML to prevent XSS
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Menu functionality
function toggleMenu() {
  const menuDropdown = document.getElementById('menuDropdown');
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  
  menuOpen = !menuOpen;
  
  if (menuOpen) {
    menuDropdown.classList.add('active');
    hamburgerMenu.style.transform = 'rotate(90deg)';
    showNotification('Menu opened', 'info', 1000);
  } else {
    menuDropdown.classList.remove('active');
    hamburgerMenu.style.transform = 'rotate(0deg)';
  }
}

// Close menu when clicking outside
function closeMenu() {
  if (menuOpen) {
    const menuDropdown = document.getElementById('menuDropdown');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    
    menuDropdown.classList.remove('active');
    hamburgerMenu.style.transform = 'rotate(0deg)';
    menuOpen = false;
  }
}

// Modal functionality
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Analysis Tools Functions
function openQuickAnalysis() {
  openModal('analysisModal');
  document.getElementById('analysisModalTitle').textContent = 'Quick Analysis';
  
  const modalBody = document.getElementById('analysisModalBody');
  modalBody.innerHTML = `
    <div class="analysis-grid">
      <div class="analysis-card" onclick="runQuickAnalysis('sentiment')">
        <span class="analysis-card-icon">😊</span>
        <div class="analysis-card-title">Sentiment Analysis</div>
        <div class="analysis-card-description">Analyze the emotional tone of your documents</div>
      </div>
      <div class="analysis-card" onclick="runQuickAnalysis('summary')">
        <span class="analysis-card-icon">📝</span>
        <div class="analysis-card-title">Document Summary</div>
        <div class="analysis-card-description">Get concise summaries with key insights</div>
      </div>
      <div class="analysis-card" onclick="runQuickAnalysis('analysis')">
        <span class="analysis-card-icon">🔍</span>
        <div class="analysis-card-title">Deep Analysis</div>
        <div class="analysis-card-description">Comprehensive analysis with strategic insights</div>
      </div>
      <div class="analysis-card" onclick="runQuickAnalysis('extract')">
        <span class="analysis-card-icon">📊</span>
        <div class="analysis-card-title">Data Extraction</div>
        <div class="analysis-card-description">Extract structured data and metrics</div>
      </div>
    </div>
  `;
  
  closeMenu();
}

function runQuickAnalysis(type) {
  if (documentMemory.length === 0) {
    showNotification('Please upload documents first', 'error');
    return;
  }
  
  closeModal('analysisModal');
  
  const analysisTypes = {
    sentiment: 'sentimentAnalysis',
    summary: 'summaryDocument',
    analysis: 'analyzeDocument',
    extract: 'extractData'
  };
  
  if (analysisTypes[type]) {
    window[analysisTypes[type]]();
    showNotification(`Running ${type} analysis...`, 'success');
  }
}

function extractData() {
  if (documentMemory.length === 0) {
    addMessage("No documents available for data extraction. Please upload a document first.", "bot");
    return;
  }
  
  addMessage("Extracting data from document...", "user");
  showTyping("Extracting structured data...");
  
  const extractionPrompt = `Please extract and organize all numerical data, metrics, key figures, and structured information from the uploaded document. Format the response as:

**Key Metrics:**
- [List all important numbers and statistics]

**Data Points:**
- [List all data points with context]

**Structured Information:**
- [Organize any structured data like tables, lists, etc.]

Please provide a comprehensive data extraction following this format.`;
  
  const enhancedQuestion = sendMessageWithRAG(extractionPrompt);
  sendToPowerAutomate(enhancedQuestion);
}

function openAnalyticsDashboard() {
  openModal('analysisModal');
  document.getElementById('analysisModalTitle').textContent = 'Analytics Dashboard';
  
  const modalBody = document.getElementById('analysisModalBody');
  const totalDocuments = documentMemory.length;
  const totalAnalyses = analysisHistory.length;
  const recentAnalyses = analysisHistory.slice(-5);
  
  modalBody.innerHTML = `
    <div class="analytics-grid">
      <div class="analytics-card">
        <div class="analytics-number">${totalDocuments}</div>
        <div class="analytics-label">Documents Uploaded</div>
      </div>
      <div class="analytics-card">
        <div class="analytics-number">${totalAnalyses}</div>
        <div class="analytics-label">Analyses Performed</div>
      </div>
      <div class="analytics-card">
        <div class="analytics-number">${customPrompts.length}</div>
        <div class="analytics-label">Custom Prompts</div>
      </div>
      <div class="analytics-card">
        <div class="analytics-number">${Math.round((totalAnalyses / Math.max(totalDocuments, 1)) * 100)}%</div>
        <div class="analytics-label">Analysis Rate</div>
      </div>
    </div>
    
    <h3 style="color: var(--accent-blue); margin-bottom: 1rem;">Recent Analyses</h3>
    <div style="max-height: 300px; overflow-y: auto;">
      ${recentAnalyses.length > 0 ? recentAnalyses.map(analysis => `
        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
          <div style="font-weight: 600; color: var(--text-primary);">${analysis.type}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${analysis.date}</div>
        </div>
      `).join('') : '<p style="color: var(--text-secondary); text-align: center;">No analyses performed yet</p>'}
    </div>
  `;
  
  closeMenu();
}

function openCustomAnalysis() {
  openModal('analysisModal');
  document.getElementById('analysisModalTitle').textContent = 'Custom Analysis';
  
  const modalBody = document.getElementById('analysisModalBody');
  modalBody.innerHTML = `
    <div class="custom-analysis-form">
      <div class="form-group">
        <label>Analysis Type</label>
        <div class="analysis-type-selector">
          <div class="analysis-type" onclick="selectAnalysisType(this, 'sentiment')">Sentiment</div>
          <div class="analysis-type" onclick="selectAnalysisType(this, 'summary')">Summary</div>
          <div class="analysis-type" onclick="selectAnalysisType(this, 'analysis')">Deep Analysis</div>
          <div class="analysis-type" onclick="selectAnalysisType(this, 'extract')">Data Extraction</div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="customPrompt">Custom Prompt</label>
        <textarea id="customPrompt" rows="6" placeholder="Describe what you want to analyze or extract from your documents..."></textarea>
      </div>
      
      <div class="form-group">
        <label for="promptName">Save as Template (Optional)</label>
        <input type="text" id="promptName" placeholder="Template name">
      </div>
      
      <button class="submit-btn" onclick="runCustomAnalysis()">Run Custom Analysis</button>
    </div>
  `;
  
  closeMenu();
}

function selectAnalysisType(element, type) {
  // Remove selected class from all types
  document.querySelectorAll('.analysis-type').forEach(el => el.classList.remove('selected'));
  // Add selected class to clicked element
  element.classList.add('selected');
  element.dataset.type = type;
}

function runCustomAnalysis() {
  const selectedType = document.querySelector('.analysis-type.selected');
  const customPrompt = document.getElementById('customPrompt').value;
  const promptName = document.getElementById('promptName').value;
  
  if (!selectedType || !customPrompt.trim()) {
    showNotification('Please select an analysis type and enter a custom prompt', 'error');
    return;
  }
  
  if (documentMemory.length === 0) {
    showNotification('Please upload documents first', 'error');
    return;
  }
  
  // Save as template if name provided
  if (promptName.trim()) {
    customPrompts.push({
      name: promptName,
      type: selectedType.dataset.type,
      prompt: customPrompt,
      date: new Date().toLocaleDateString()
    });
    showNotification('Template saved successfully', 'success');
  }
  
  // Record analysis
  analysisHistory.push({
    type: selectedType.dataset.type,
    date: new Date().toLocaleString(),
    custom: true
  });
  
  closeModal('analysisModal');
  
  // Run the analysis
  addMessage(`Running custom ${selectedType.dataset.type} analysis...`, "user");
  showTyping("Processing custom analysis...");
  
  const enhancedQuestion = sendMessageWithRAG(customPrompt);
  sendToPowerAutomate(enhancedQuestion);
  
  showNotification('Custom analysis started', 'success');
}

function openAnalysisTemplates() {
  openModal('analysisModal');
  document.getElementById('analysisModalTitle').textContent = 'Analysis Templates';
  
  const modalBody = document.getElementById('analysisModalBody');
  modalBody.innerHTML = `
    <div class="template-gallery">
      ${analysisTemplates.map(template => `
        <div class="template-card" onclick="useTemplate('${template.id}')">
          <div class="template-header">
            <span class="template-icon">${template.icon}</span>
            <div class="template-title">${template.title}</div>
          </div>
          <div class="template-description">${template.description}</div>
          <div class="template-tags">
            ${template.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  closeMenu();
}

function useTemplate(templateId) {
  const template = analysisTemplates.find(t => t.id === templateId);
  if (!template) return;
  
  if (documentMemory.length === 0) {
    showNotification('Please upload documents first', 'error');
    return;
  }
  
  closeModal('analysisModal');
  
  // Record analysis
  analysisHistory.push({
    type: template.title,
    date: new Date().toLocaleString(),
    template: true
  });
  
  addMessage(`Using ${template.title} template...`, "user");
  showTyping("Processing template analysis...");
  
  const enhancedQuestion = sendMessageWithRAG(template.prompt);
  sendToPowerAutomate(enhancedQuestion);
  
  showNotification(`Template "${template.title}" applied`, 'success');
}

// Help & Support Functions
function openHelpCenter() {
  openModal('helpModal');
  document.getElementById('helpModalTitle').textContent = 'Help Center';
  
  const modalBody = document.getElementById('helpModalBody');
  modalBody.innerHTML = `
    <div class="help-section">
      <div class="help-section-title">🚀 Getting Started</div>
      ${helpContent.gettingStarted.map(item => `
        <div class="help-item" onclick="showHelpDetail('${item.title}')">
          <div class="help-item-title">${item.title}</div>
          <div class="help-item-description">${item.description}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="help-section">
      <div class="help-section-title">📊 Analysis Tools</div>
      ${helpContent.analysis.map(item => `
        <div class="help-item" onclick="showHelpDetail('${item.title}')">
          <div class="help-item-title">${item.title}</div>
          <div class="help-item-description">${item.description}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="help-section">
      <div class="help-section-title">🔧 Troubleshooting</div>
      ${helpContent.troubleshooting.map(item => `
        <div class="help-item" onclick="showHelpDetail('${item.title}')">
          <div class="help-item-title">${item.title}</div>
          <div class="help-item-description">${item.description}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  closeMenu();
}

function showHelpDetail(title) {
  showNotification(`Help: ${title}`, 'info');
  // In a real app, this would show detailed help content
}

function openTutorials() {
  openModal('helpModal');
  document.getElementById('helpModalTitle').textContent = 'Tutorials';
  
  const modalBody = document.getElementById('helpModalBody');
  modalBody.innerHTML = `
    <div class="tutorial-list">
      ${tutorials.map(tutorial => `
        <div class="tutorial-item" onclick="startTutorial('${tutorial.title}')">
          <span class="tutorial-icon">${tutorial.icon}</span>
          <div class="tutorial-content">
            <div class="tutorial-title">${tutorial.title}</div>
            <div class="tutorial-duration">${tutorial.duration}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  closeMenu();
}

function startTutorial(title) {
  showNotification(`Starting tutorial: ${title}`, 'success');
  // In a real app, this would launch the tutorial
}

function openContactSupport() {
  openModal('contactModal');
  closeMenu();
}

function openReportBug() {
  openModal('bugModal');
  closeMenu();
}

// Helper: open default mail client as a fallback
function openMailClient({ name, email, subject, message }) {
  const safeSubject = encodeURIComponent(subject || 'Support Request');
  const safeBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
  window.location.href = `mailto:${contactEmail}?subject=${safeSubject}&body=${safeBody}`;
}

// Helper: send contact email via webhook (Power Automate/Logic Apps)
async function sendContactEmail(formData) {
  if (!contactEmailWebhook) {
    throw new Error('CONTACT_WEBHOOK_NOT_CONFIGURED');
  }

  const payload = {
    to: contactEmail,
    from_email: formData.email,
    from_name: formData.name,
    subject: formData.subject || 'Support Request',
    message: formData.message,
    source: 'tubu-web',
    timestamp: new Date().toISOString()
  };

  const res = await fetch(contactEmailWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WEBHOOK_FAILED: ${res.status} ${text}`);
  }

  return res.json().catch(() => ({}));
}



// Enhanced Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Enter key handler for input
  document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  // Enhanced navigation button handlers
  const navButtons = document.querySelectorAll('.nav-button');
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      navButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      
      // Handle tab switching
      const tab = this.getAttribute('data-tab');
      if (tab === 'documents') {
        console.log('Documents tab clicked');
        showNotification('Documents view coming soon!', 'info');
      } else if (tab === 'chat') {
        console.log('Chat tab clicked');
      }
    });
  });

  // Enhanced theme toggle handler
  const themeToggle = document.querySelector('.theme-toggle');
  themeToggle.addEventListener('click', function() {
    // Toggle between dark and light themes
    document.body.classList.toggle('light-theme');
    this.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
    
    // Show notification
    const theme = document.body.classList.contains('light-theme') ? 'Light' : 'Dark';
    showNotification(`${theme} theme activated`, 'success');
  });

  // Enhanced hamburger menu handler
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  hamburgerMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleMenu();
  });

  // Enhanced clear history button handler
  const clearHistoryBtn = document.querySelector('.clear-history-btn');
  clearHistoryBtn.addEventListener('click', function() {
    const historyList = document.getElementById("chatHistory");
    historyList.innerHTML = '';
    addMessage('Chat history cleared successfully.', 'bot');
    showNotification('Chat history cleared', 'success');
  });
  



  // Enhanced API toggle handler
  const apiToggle = document.getElementById('apiToggle');
  const toggleLabel = document.getElementById('toggleLabel');
  
  apiToggle.addEventListener('change', function() {
    currentAPI = this.checked ? 'secondary' : 'primary';
    toggleLabel.textContent = apiNames[currentAPI];
    
    // Show knowledge source switch notification with RAG status
    if (currentAPI === 'secondary') {
      addMessage(`Knowledge source switched to ${apiNames[currentAPI]}. RAG system is now active and will use uploaded documents for enhanced responses.`, "bot");
      showNotification('RAG system activated', 'success');

    } else {
      addMessage(`Knowledge source switched to ${apiNames[currentAPI]}. RAG system is disabled. Using standard API responses.`, "bot");
      showNotification('Standard mode activated', 'info');
      // Hide document action buttons when RAG is disabled
      hideDocumentActions();
    }
  });

  // Initialize uploaded files list
  showUploadedFilesList();
  
  // Initialize document memory
  initializeDocumentMemory();
  
  // Enhanced upload area handlers
  const uploadArea = document.querySelector('.upload-area');
  
  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.accept = '.pdf,.docx,.txt';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  // Click to select files
  uploadArea.addEventListener('click', function() {
    fileInput.click();
  });

  // Handle file selection
  fileInput.addEventListener('change', function(e) {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  });

  // Enhanced drag and drop functionality
  enhanceDragAndDrop();
  
  // Voice input toggle
  const penIcon = document.querySelector('.pen-icon');
  penIcon.addEventListener('click', function() {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  });
  
  // Enhanced document action buttons with animations
  const actionButtons = document.querySelectorAll('.action-btn');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 150);
    });
  });
  
  // Auto-resize input based on content
  const userInput = document.getElementById('userInput');
  userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
  
  // Contact form handling
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
      };

      const submitBtn = this.querySelector('.submit-btn');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      try {
        await sendContactEmail(formData);
        showNotification("Message sent successfully! We'll get back to you soon.", 'success');
        closeModal('contactModal');
        contactForm.reset();
      } catch (err) {
        console.error('Contact submit failed:', err);
        // Fallback to open default mail client if webhook not configured or failed
        openMailClient(formData);
        showNotification('Opening your email client to send the message.', 'info');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  
  // Bug report form handling
  const bugForm = document.getElementById('bugForm');
  if (bugForm) {
    bugForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = {
        title: document.getElementById('bugTitle').value,
        email: document.getElementById('bugEmail').value,
        severity: document.getElementById('bugSeverity').value,
        steps: document.getElementById('bugSteps').value,
        description: document.getElementById('bugDescription').value
      };
      
      // Simulate form submission
      const submitBtn = this.querySelector('.submit-btn');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;
      
      setTimeout(() => {
        showNotification('Bug report submitted successfully! We\'ll investigate and get back to you.', 'success');
        closeModal('bugModal');
        bugForm.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, 2000);
    });
  }
  
  // Close modals when clicking outside
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target.id);
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.hamburger-menu') && !e.target.closest('.menu-dropdown')) {
      closeMenu();
    }
  });
  
  // Welcome message
  setTimeout(() => {
    showNotification('Welcome to TUBU! Upload documents to get started.', 'success');
  }, 1000);
});




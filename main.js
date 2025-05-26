import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection as fbCollection, // Aliased as fbCollection per example
    addDoc as fbAddDoc,         // Aliased as fbAddDoc per example
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyC6_YxN8rPpev7VcwdIs1TlsLDdUbDBjFY",
    authDomain: "transport-c3455.firebaseapp.com",
    databaseURL: "https://transport-c3455-default-rtdb.firebaseio.com",
    projectId: "transport-c3455",
    storageBucket: "transport-c3455.appspot.com",
    messagingSenderId: "485137213920",
    appId: "1:485137213920:web:421d5bd6bdf31d95d9a385",
    measurementId: "G-PX46L500K2"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firestore instance
const firestore = getFirestore(app);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
// ADD THIS LISTENER:
pc.onconnectionstatechange = event => {
    const connectionState = pc.connectionState;
    addLogMessage(`Connection state changed: ${connectionState}`, 'system');
    console.log(`Peer Connection state changed: ${connectionState}`);

    if (connectionState === 'disconnected' || connectionState === 'failed' || connectionState === 'closed') {
        addLogMessage('A player may have disconnected or the connection failed.', 'error');
        // Basic handling: Announce and potentially reset parts of the game UI or state.
        // A more robust solution would try to identify which player and manage game state accordingly (e.g., remove player, pause game).
        // For now, we mostly log it. If game is active, it might disrupt.
        if (gameActive) {
            // Consider if the game should be paused or stopped.
            // For now, it will continue, but turns might be skipped or timers might run out
            // if the disconnected player was the current one and no one takes over their turn.
        }
        // You might want to re-enable call/answer buttons if appropriate, or prompt for a new call.
        // hangup(); // Calling hangup might be too abrupt, but it does reset state.
    } else if (connectionState === 'connected') {
        addLogMessage('Successfully connected to peer.', 'system');
        // This is a good place to confirm that both local and remote streams are being handled if not already.
    }
};
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

// Game Logic Variables
let players = []; // Array of player objects/identifiers
let currentPlayerIndex = 0; // Will point to the current player in the 'players' array
let currentCategory = '';
let turnTimer = null;
const TURN_DURATION = 5000; // 5 seconds for a turn
let gameUnsubscribe = null; // To store Firestore listener unsubscribe function
window.lastProcessedEventTimestamp = null; // To track processed call-out events
let turnCountdownInterval = null; // For the live timer
let gameActive = false; // To track if a game is currently in progress
let localPlayerId = null; // To store the local player's unique ID (could be Firebase UID or a generated one)

// Example of how player objects might look (can be expanded)
// players = [
//  { id: 'player1_id', name: 'Player 1', stream: localStream },
//  { id: 'player2_id', name: 'Player 2', stream: remoteStream }
// ];

// HTML Game Elements
const currentCategoryDisplay = document.getElementById('currentCategory');
const currentPlayerDisplay = document.getElementById('currentPlayer');
const timeRemainingDisplay = document.getElementById('timeRemaining');
const categoryInput = document.getElementById('categoryInput');
const setCategoryButton = document.getElementById('setCategoryButton');
const nameInput = document.getElementById('nameInput');
const submitNameButton = document.getElementById('submitNameButton');
const callOutButton = document.getElementById('callOutButton');
const startGameButton = document.getElementById('startGameButton');
const playerListUL = document.getElementById('playerList'); // New
const gameLogUL = document.getElementById('gameLog');     // New
const toggleHelpButton = document.getElementById('toggleHelpButton'); // New
const helpContent = document.getElementById('helpContent');         // New
// Add any new game-related UI elements here if created in index.html
const gameInfoDiv = document.querySelector('.game-info');
const gameActionsDiv = document.querySelector('.game-actions');


// 1. Setup media sources

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  // Prepare for game: Assume local player is the first one for now
  // A proper lobby system would handle player joining and ID assignment.
  localPlayerId = 'player' + Math.random().toString(36).substr(2, 9); // Simple unique ID
  const localPlayerName = prompt("Enter your name:", "Player 1") || `Player_${players.length + 1}`;
  players.push({ id: localPlayerId, name: localPlayerName, stream: localStream });
  addLogMessage(`${localPlayerName} joined the game.`, 'join');

  // Show game controls once webcam is on, assuming this is part of "joining"
  initializeGame();
  updateGameUI(); // Initial UI update

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
};

// 2. Create an offer
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  // const callsCollection = fbCollection(firestore, 'calls'); // Not directly used, but demonstrates fbCollection
  const callDocRef = await fbAddDoc(fbCollection(firestore, 'calls'), {}); // Create a new document with a generated ID
  const offerCandidates = fbCollection(callDocRef, 'offerCandidates'); // Use the doc reference
  const answerCandidates = fbCollection(callDocRef, 'answerCandidates'); // Use the doc reference

  callInput.value = callDocRef.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && fbAddDoc(offerCandidates, event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await setDoc(callDocRef, { offer }); // Use setDoc with the DocumentReference

  // Listen for remote answer
  onSnapshot(callDocRef, (snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  // ADD THIS: Setup game state listener after offer is made (or call is joined)
  setupGameListener(callDocRef.id);
  hangupButton.disabled = false; // This is already there
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDocRef = doc(firestore, 'calls', callId); // Get DocumentReference
  const answerCandidates = fbCollection(callDocRef, 'answerCandidates'); // Use the doc reference
  const offerCandidates = fbCollection(callDocRef, 'offerCandidates'); // Use the doc reference

  pc.onicecandidate = (event) => {
    event.candidate && fbAddDoc(answerCandidates, event.candidate.toJSON());
  };

  const callSnapshot = await getDoc(callDocRef); // Use getDoc
  const callData = callSnapshot.data();

  if (callData && callData.offer) { // Check if callData and offer exist
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDocRef, { answer }); // Use updateDoc

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        console.log(change);
        if (change.type === 'added') {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
    // ADD THIS: Setup game state listener after answer is made
    setupGameListener(callId);
  } else {
    console.error('Call data or offer not found for call ID:', callId);
    alert('Could not find the call. Please check the Call ID.');
  }
};

// Game Logic Functions
function initializeGame() {
    console.log("Game Initializing...");
    // Setup initial game state, possibly after players have joined.
    // For now, let's assume players are managed outside this function.
    // We might need a lobby system or a way for players to signal readiness.
    gameInfoDiv.style.display = 'block';
    gameActionsDiv.style.display = 'block';
    webcamButton.disabled = true; // Assuming webcam is started to join/start a game
    callButton.disabled = true;
    answerButton.disabled = true;

    // More setup here, like deciding who is player 1, player 2 etc.
    // This could be based on who initiated the call or a more complex lobby system.
    nameInput.disabled = true;
    submitNameButton.disabled = true;
}

function startGame() {
    if (players.length < 2) {
        alert("Need at least 2 players to start the game!");
        return;
    }
    if (!currentCategory) {
        alert("Please set a category first!");
        return;
    }
    gameActive = true;
    currentPlayerIndex = 0; // Start with the player at index 0
    console.log("Game Started! Category:", currentCategory, "Players:", players.map(p => p.name));
    addLogMessage(`Game started! Category: ${currentCategory}. First player: ${players[0].name}`, 'system');
    setupNextPlayerTurn(); // Call the new function to setup the turn
    // updateGameUI() is called within setupNextPlayerTurn
}

// Renamed from nextTurn - Sets up the current player's turn
function setupNextPlayerTurn() {
    if (!gameActive || players.length === 0) {
        gameActive = false;
        updateGameUI(); // Update UI to reflect game ended or error
        return;
    }

    clearTimeout(turnTimer); // Clear any existing timer
    clearInterval(turnCountdownInterval); // Clear previous countdown

    // currentPlayerIndex should already point to the correct player for THIS turn.
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) {
        console.error("Error: No current player found at index:", currentPlayerIndex, "Players:", players);
        gameActive = false; // Stop the game if something is wrong
        updateGameUI();
        return;
    }
    
    console.log("Setting up turn for:", currentPlayer.name);
    addLogMessage(`${currentPlayer.name}'s turn.`, 'turn');
    updateGameUI(); // Update UI to show who is playing

    if (currentPlayer.id === localPlayerId) {
        nameInput.disabled = false;
        submitNameButton.disabled = false;
        nameInput.focus(); // Focus on the input field for the current player
    } else {
        nameInput.disabled = true;
        submitNameButton.disabled = true;
    }

    let timeLeft = TURN_DURATION / 1000;
    if (timeRemainingDisplay) timeRemainingDisplay.textContent = timeLeft;

    turnCountdownInterval = setInterval(() => {
        timeLeft--;
        if (timeRemainingDisplay) timeRemainingDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(turnCountdownInterval);
            // Timeout logic is already in the setTimeout below, no need to duplicate
        }
    }, 1000);

    turnTimer = setTimeout(() => {
        clearInterval(turnCountdownInterval); // Clear countdown on timeout
        console.log(currentPlayer.name, "ran out of time!");
        addLogMessage(`${currentPlayer.name} ran out of time! Turn skipped.`, 'timeout');
        alert(currentPlayer.name + " ran out of time!"); // User feedback
        // TODO: Handle timeout: mark as failed turn, implement penalty

        if (currentPlayer.id === localPlayerId) { // Ensure these are disabled on timeout too
            nameInput.disabled = true;
            submitNameButton.disabled = true;
        }

        // Rotate player to the end of the queue
        if (players.length > 1) {
            const timedOutPlayer = players.splice(currentPlayerIndex, 1)[0];
            players.push(timedOutPlayer);
        }
        // After splice, if currentPlayerIndex was, e.g., 0 from a list of 3,
        // it remains 0, and players[0] is the new player.
        // If currentPlayerIndex was pointing to the last player in the list before splice,
        // it might now be out of bounds. Reset to 0 if that's the case.
        if (currentPlayerIndex >= players.length && players.length > 0) {
            currentPlayerIndex = 0;
        }
        // The next player is now at the (potentially adjusted) currentPlayerIndex.
        setupNextPlayerTurn(); // Setup for the new player at the current index
    }, TURN_DURATION);
}

async function handlePlayerInput() { // Make async for await
    if (!gameActive || !players[currentPlayerIndex] || players[currentPlayerIndex].id !== localPlayerId) {
        alert("Not your turn, game not active, or you are not the current player!");
        return;
    }

    const itemName = nameInput.value.trim();
    if (!itemName) {
        alert("Please enter an item name.");
        return;
    }

    // Disable input while processing to prevent double submission
    submitNameButton.disabled = true;
    nameInput.disabled = true;

    console.log(players[currentPlayerIndex].name, "says:", itemName, "(1st time)");
    // TODO: Display this first utterance in the UI if desired

    playClapSound();

    // Simulate a short delay for the clap and the second utterance
    await new Promise(resolve => setTimeout(resolve, 700)); // 0.7 second delay

    console.log(players[currentPlayerIndex].name, "says:", itemName, "(2nd time, after clap)");
    // TODO: Display this second utterance or confirmation in UI

    // TODO: Broadcast this action (full sequence completed) to other players.

    clearTimeout(turnTimer); // Reset main turn timer
    clearInterval(turnCountdownInterval); // Clear countdown on successful input
    addLogMessage(`${players[currentPlayerIndex].name} submitted: ${itemName}`, 'action');


    nameInput.value = ''; // Clear input for the next player

    // Successful turn: Rotate this player to the end of the queue.
    if (players.length > 1) {
        const currentPlayerWhoPlayed = players.splice(currentPlayerIndex, 1)[0];
        players.push(currentPlayerWhoPlayed);
    }
    // Adjust currentPlayerIndex if it's now out of bounds (e.g., the player was the last in the list)
    if (currentPlayerIndex >= players.length && players.length > 0) {
        currentPlayerIndex = 0; // Reset to the start of the list
    }
    // The next player is now at the (potentially adjusted) currentPlayerIndex.
    setupNextPlayerTurn(); // This will handle rotation and setting up the next turn.
}

function playClapSound() {
    const clapAudio = document.getElementById('clapAudio');
    if (clapAudio) {
        clapAudio.currentTime = 0; // Rewind to start
        clapAudio.play().catch(error => {
            console.error("Error playing clap sound:", error);
            // Autoplay policies might prevent sound without user interaction.
        });
        console.log("(Clap Sound Plays)");
    } else {
        console.warn("Clap audio element not found.");
    }
}

async function handleCallOut() { // Make async for Firestore
    if (!gameActive || players.length === 0) {
        alert("Game is not active or no players to call out.");
        return;
    }

    const callId = callInput.value;
    if (!callId) {
        alert("Cannot call out without an active call/game ID.");
        return;
    }

    // Determine who is being called out.
    // For simplicity, let's assume the call out is against the current player (players[currentPlayerIndex]).
    // More complex logic could allow selecting a player or calling out a previous action.
    const calledOutPlayer = players[currentPlayerIndex];
    if (!calledOutPlayer) {
        console.error("No current player to call out.");
        return;
    }

    const callerPlayer = players.find(p => p.id === localPlayerId);
    const callerName = callerPlayer ? callerPlayer.name : "Someone";

    console.log(callerName, "is calling out", calledOutPlayer.name);
    // alert(`${callerName} is calling out ${calledOutPlayer.name}!`); // Local feedback

    try {
        const gameDocRef = doc(firestore, 'games', callId); // Use doc()
        // Use a subcollection for events or update a specific field.
        // For simplicity, let's add a 'lastEvent' or similar field.
        // A more robust way would be an array of events or a subcollection.
        await setDoc(gameDocRef, { // Use setDoc() with merge option
            lastEvent: {
                type: 'call_out',
                calledOutPlayerId: calledOutPlayer.id,
                calledOutPlayerName: calledOutPlayer.name,
                callerId: localPlayerId,
                callerName: callerName,
                timestamp: serverTimestamp() // Use serverTimestamp()
            }
        }, { merge: true });
        
        // The actual game logic response to the call out (e.g., ending turn)
        // will be handled by the Firestore listener reacting to this event.
        // This prevents the caller from directly manipulating game state for all.

    } catch (error) {
        console.error("Error sending call out to Firestore:", error);
        alert("Failed to send call out. Please try again.");
    }
}

async function setCategory() { // Make it async for Firestore operations
    const category = categoryInput.value.trim();
    if (!category) {
        alert("Please enter a category.");
        return;
    }

    const callId = callInput.value;
    if (!callId) {
        alert("Cannot set category without an active call/game ID.");
        return;
    }

    try {
        const gameDocRef = doc(firestore, 'games', callId); // Use doc()
        await setDoc(gameDocRef, { currentCategory: category }, { merge: true }); // Use setDoc()
        
        // currentCategory = category; // This will be updated by the listener
        console.log("Category proposed:", category, "for game:", callId);
        categoryInput.value = '';
        // updateGameUI() will be called by the listener when category changes
        // If startGame() is only enabled after category is set, handle that logic here or in UI update.
    } catch (error) {
        console.error("Error setting category in Firestore:", error);
        alert("Failed to set category. Please try again.");
    }
}

function setupGameListener(gameId) {
    if (gameUnsubscribe) {
        gameUnsubscribe();
    }

    const gameDocRef = doc(firestore, 'games', gameId); // Use doc()
    gameUnsubscribe = onSnapshot(gameDocRef, (docSnapshot) => { // Use onSnapshot() and rename param
        if (docSnapshot.exists()) { // Use exists() method
            const gameData = docSnapshot.data(); // Use data() method
            console.log("Game data from Firestore:", gameData);

            // Category Update (existing)
            if (gameData.currentCategory !== undefined) {
                if (currentCategory !== gameData.currentCategory) {
                    currentCategory = gameData.currentCategory;
                    console.log("Category updated from Firestore:", currentCategory);
                    addLogMessage(`Category set to: ${currentCategory}`, 'system');
                    updateGameUI();
                    if (currentCategory && players.length >= 2 && !gameActive) {
                        const startGameButton = document.getElementById('startGameButton');
                        if (startGameButton) startGameButton.disabled = false;
                    }
                }
            }

            // ADD THIS: Handle Call Out Event
            if (gameData.lastEvent && gameData.lastEvent.type === 'call_out') {
                // To prevent processing the same event multiple times, we might need a client-side check
                // if this event has already been processed, e.g., by comparing timestamps or a unique event ID.
                // For now, we'll process it if the timestamp is new or different.
                // This is a simplification; a robust solution uses unique event IDs.
                if (!window.lastProcessedEventTimestamp || 
                    (gameData.lastEvent.timestamp && window.lastProcessedEventTimestamp !== gameData.lastEvent.timestamp.toMillis())) {
                    
                    if(gameData.lastEvent.timestamp) {
                       window.lastProcessedEventTimestamp = gameData.lastEvent.timestamp.toMillis();
                    } else {
                        // Fallback if timestamp is not immediately available (e.g. client set before server)
                        window.lastProcessedEventTimestamp = Date.now(); 
                    }

                    const { calledOutPlayerName, callerName } = gameData.lastEvent;
                    alert(`EVENT: ${callerName} called out ${calledOutPlayerName}!`);
                    addLogMessage(`${callerName} called out ${calledOutPlayerName}! ${calledOutPlayerName}'s turn is skipped.`, 'callout');
                    console.log(`Event from Firestore: ${callerName} called out ${calledOutPlayerName}`);

                    // Now, apply game logic for the call out.
                    // This assumes the called-out player is the one whose turn it effectively was.
                    if (gameActive && players.length > 0 && players[currentPlayerIndex] && players[currentPlayerIndex].name === calledOutPlayerName) {
                        console.log(calledOutPlayerName, "was called out. Their turn ends.");
                        clearTimeout(turnTimer); // Stop their timer
                        clearInterval(turnCountdownInterval); // Also clear countdown

                        // Disable inputs for the called-out player if it's the local client
                        if (players[currentPlayerIndex].id === localPlayerId) {
                            nameInput.disabled = true;
                            submitNameButton.disabled = true;
                        }
                        
                        // Rotate the called-out player to the end of the queue
                        if (players.length > 1) {
                            const calledPlayer = players.splice(currentPlayerIndex, 1)[0];
                            players.push(calledPlayer);
                        }
                        if (currentPlayerIndex >= players.length && players.length > 0) {
                            currentPlayerIndex = 0;
                        }
                        setupNextPlayerTurn(); // Move to the next player
                    }
                }
            }
            // --- End of Call Out Event Handling ---

        } else {
            console.log("Game document does not exist (yet) for ID:", gameId);
        }
    }, (error) => {
        console.error("Error listening to game state:", error);
    });
}

function updateGameUI() {
    if (currentCategoryDisplay) currentCategoryDisplay.textContent = currentCategory || 'Not set';
    
    // Time remaining is now handled by setupNextPlayerTurn's interval
    // if (timeRemainingDisplay) {
    // timeRemainingDisplay.textContent = `${TURN_DURATION / 1000}s`; 
    // }

    if (players.length > 0 && gameActive && players[currentPlayerIndex]) {
        if (currentPlayerDisplay) currentPlayerDisplay.textContent = players[currentPlayerIndex].name;
    } else if (currentPlayerDisplay) {
        currentPlayerDisplay.textContent = 'N/A';
    }

    // Update Player List
    if (playerListUL) {
        playerListUL.innerHTML = ''; // Clear existing list
        players.forEach((player, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${player.name}`;
            if (gameActive && index === currentPlayerIndex) {
                li.classList.add('active-player');
            }
            playerListUL.appendChild(li);
        });
    }
    // TODO: Update other UI elements like player lists, scores, etc.
}

function hangup() {
    // Based on existing WebRTC hangup logic which needs to be implemented
    console.log("Hanging up call and resetting game state.");
    clearInterval(turnCountdownInterval); // Clear any active countdown
    if (pc) {
        pc.close();
        // pc = new RTCPeerConnection(servers); // Reinitialize for a new call // Should be careful with this, might need new object
    }
    nameInput.disabled = true;
    submitNameButton.disabled = true;
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }

    localStream = null;
    remoteStream = null;

    webcamVideo.srcObject = null;
    remoteVideo.srcObject = null;

    callButton.disabled = true;
    answerButton.disabled = true;
    hangupButton.disabled = true;
    webcamButton.disabled = false;
    callInput.value = '';

    // Reset game state
    players = [];
    currentPlayerIndex = 0;
    currentCategory = '';
    clearTimeout(turnTimer);
    gameActive = false;
    if (gameInfoDiv) gameInfoDiv.style.display = 'none';
    if (gameActionsDiv) gameActionsDiv.style.display = 'none';

    if (gameUnsubscribe) {
        gameUnsubscribe();
        gameUnsubscribe = null;
        console.log("Game listener unsubscribed.");
    }
    currentCategory = ''; // Explicitly reset local currentCategory on hangup
    addLogMessage('Call ended. Game reset.', 'system');
    updateGameUI(); // Ensure UI reflects the reset
    console.log("Call ended and game reset.");
}

hangupButton.onclick = async () => {
  hangup();
};

// Add this towards the end of the script, or after function definitions
if (setCategoryButton) setCategoryButton.onclick = setCategory;
if (submitNameButton) submitNameButton.onclick = handlePlayerInput;
if (callOutButton) callOutButton.onclick = handleCallOut;
if (startGameButton) startGameButton.onclick = startGame; // Add this

// Initial UI State: Hide game sections until webcam/call is active
if (gameInfoDiv) gameInfoDiv.style.display = 'none';
if (gameActionsDiv) gameActionsDiv.style.display = 'none';

if (toggleHelpButton) {
    toggleHelpButton.onclick = () => {
        if (helpContent) {
            helpContent.style.display = helpContent.style.display === 'none' ? 'block' : 'none';
        }
    };
}

function addLogMessage(message, type = 'info') {
    if (!gameLogUL) return;
    const li = document.createElement('li');
    li.textContent = message;
    li.classList.add(`log-${type}`); // For potential styling based on type
    
    // Prepend to keep newest messages at the top, and limit log length
    if (gameLogUL.firstChild) {
        gameLogUL.insertBefore(li, gameLogUL.firstChild);
    } else {
        gameLogUL.appendChild(li);
    }

    while (gameLogUL.children.length > 20) { // Keep max 20 log messages
        gameLogUL.removeChild(gameLogUL.lastChild);
    }
}
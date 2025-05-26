# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# Games-hub
A game hub that has a collection of Christian games, nostalgic gaming experiences, and educational games.

## Game 1: Name, Place, Animal, Thing

This document outlines the core features and mechanics for the multiplayer word game.I. Core Gameplay MechanicsMultiplayer:Supports up to 100 players simultaneously but usually you have 2 to 6 people playing.Objective:Players fill in predefined and custom categories with words starting with a designated letter for each round.Categories:Default Categories: Name (of a person), Animal, Place, Thing.Custom Categories: Players can suggest and add new categories (e.g., "Cars," "Movies," "Foods") to tailor the game to their interests.Rounds:The game consists of a maximum of 26 rounds, one for each letter of the alphabet (A-Z).A letter cannot be repeated in a single game session.Letter Selection:A letter is chosen for each round (method to be decided, e.g., random, sequential).Gameplay Flow per Round:A letter is announced/displayed.Players fill in words for each active category, starting with that letter.The first player to complete all categories for the round initiates a 10-second countdown for all other players.Once the countdown ends, or all players have finished, the round concludes, and answers are revealed for scoring.II. Scoring SystemBase Score:A maximum point value is set for a unique answer in a category (e.g., 10 points).Unique Answers:If a player's answer in a category is unique (no other player wrote the same word), they receive the maximum points for that category.Non-Unique Answers (Percentage Multiplier):If multiple players provide the same answer for a category:The score awarded is a percentage of the maximum points.The percentage is inversely proportional to how common the answer is. For example:If 2 out of 10 players have the same answer, they might get 80% of the max score.If 8 out of 10 players have the same answer, they might get 20% of the max score.No Answer/Invalid Answer:0 points for categories left blank or with invalid entries.Answer are vetted by peers for small group of less than 6 for more dictionary or word bank is used and for answers not found in them the the peers vet it.III. User Interface (UI) & User Experience (UX)Input Methods:Players can input answers using:Text Typing: Standard keyboard input.Voice Input: Speech-to-text functionality.Category Management:Players can rearrange the order in which categories are displayed and answered to suit their strategy (e.g., using drag-and-drop).The interface should clearly display only the active categories for the current game.In-Game Display:Clear indication of the current letter for the round.Visible list of categories to be filled.A visual 10-second countdown timer when initiated.Real-time feedback (optional, e.g., a checkmark when a category is filled).End-of-Round Display:Show all players' answers for each category.Clearly display scores for the round and cumulative scores.IV. Additional Feature SuggestionsHere are some extra ideas that could enhance the game:Player Accounts & Profiles:Usernames, avatars.Personal stats (win/loss ratio, favorite categories, average score).Leaderboards:Global, regional, or friends-based leaderboards (daily, weekly, all-time).Game Modes:Classic Mode: The rules as described above.Speed Mode: Shorter countdowns, perhaps fewer categories.Team Play: Players form teams and scores are pooled.Custom Games: Allow hosts to set specific rules (e.g., number of rounds, specific categories only, timer duration).Word Validation & Dispute System:Basic spell-checking.A system for players to challenge/validate questionable answers (e.g., community voting, simple dictionary lookup API). This is important for fairness.Letter Selection Options:Random: A letter is picked randomly each round.Sequential: A-Z.Player Voted: Players vote on the next letter.Player choice: each player will take turns picking an alphabet.Visual & Audio Polish:Engaging UI design and animations.Sound effects for game events (timer, round end, score updates).Optional background music.Tutorial/Help Section:An interactive tutorial for new players explaining the rules and UI.Social Features:Invite friends to games.Share game results or achievements on social media.Tie-Breaker Rules:Define how ties are handled at the end of the game (e.g., a tie-breaker round, most unique answers throughout the game).Notifications:Reminders for game invites or when it's a player's turn (if the game incorporates asynchronous elements, though current design is real-time).Accessibility Features:Adjustable font sizes, high-contrast themes.

---

## Game 2: Rhythmic Naming Game

The Rhythmic Naming Game is a turn-based, rhythmic naming challenge played over video chat. Players take turns naming items fitting a pre-determined category, following a "Name-Clap-Name" rhythm simulated by the application. It features real-time audio/video, synchronized game state, and a "Call Out" mechanic.

This game is implemented with HTML, CSS, and JavaScript, utilizing WebRTC for peer-to-peer communication and Firebase Firestore for signaling and game state synchronization.

**Key Features:**
*   Real-time video and audio chat.
*   Turn-based gameplay with a 5-second timer per turn.
*   Player queue that rotates after each turn.
*   Synchronized category setting.
*   Automated "clap" sound during the "Name-Clap-Name" sequence (requires `clap.mp3`).
*   "Call Out!" feature to challenge other players.
*   Dynamic UI showing current player, category, player list, game log, and turn timer.

**Full Documentation & How to Play:**
*   For detailed rules, gameplay instructions, and feature explanations, please see the [**Game Documentation (GAME_DOCUMENTATION.md)**](./GAME_DOCUMENTATION.md).

**Testing the Game:**
*   To set up a local environment and test the game, please refer to the [**Testing Guide (TESTING_GUIDE.md)**](./TESTING_GUIDE.md).
*   **Important:** You will need a `clap.mp3` file in the root directory for the clap sound to work during testing.

---

(If there are more games or a general contribution/license section, they would follow here)

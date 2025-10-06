# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese flashcards learning application built with React, featuring a Spaced Repetition System (SRS) for optimized language learning. The app uses browser-based speech synthesis for Japanese pronunciation.

## Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **Speech**: Browser Web Speech API (speechSynthesis)

## Development Commands

```bash
# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install
```

## Architecture

### Core Application Structure

- **`src/App.tsx`**: Main application component containing all learning logic
- **`src/main.jsx`**: React entry point that mounts the FlashcardApp
- **`src/index.css`**: Tailwind CSS imports and global styles
- **`index.html`**: HTML entry point

### SRS Algorithm Implementation

The app implements the SuperMemo SM-2 algorithm for spaced repetition:

- **Card States**: `learning` → `reviewing` → `mastered`
- **Quality Rating**: User feedback translates to quality scores (5 for correct, 2 for incorrect)
- **Interval Calculation**: Based on ease factor, repetitions, and previous intervals
- **Mastery Criteria**: 3+ repetitions with 21+ day intervals

Key SRS functions in `src/App.tsx`:
- `calculateNextReview()` (lines 68-107): Core SM-2 algorithm implementation
- `handleFeedback()` (lines 109-134): Updates card state based on user response
- `initializeSRSData()` (lines 18-30): Sets up initial SRS metadata for flashcards

### Application Modes

1. **Normal Mode**: Standard flashcard learning
2. **Focus Mode**: Filters out mastered cards, shows accuracy feedback buttons
3. **Stats Mode**: Displays learning statistics and progress

### Data Structure

Each flashcard contains:
- **Word data**: `word`, `reading`, `meaning`, `level` (JLPT level), `lesson`
- **Example sentences**: `example`, `exampleCN`, `romaji`
- **SRS metadata**: `status`, `interval`, `easeFactor`, `repetitions`, `nextReview`, `lastReview`, `correctCount`, `incorrectCount`

### Voice Synthesis Integration

Japanese text-to-speech is handled by the `speakJapanese()` function (lines 136-165):
- Automatically selects Japanese voices from available system voices
- User can choose specific voice from dropdown
- Speaks both vocabulary words and example sentences

## Key Features to Maintain

1. **SRS Integrity**: When modifying review logic, preserve the SM-2 algorithm parameters (ease factor range 1.3+, interval progression)
2. **State Management**: All SRS data is stored in React state - no backend/persistence currently implemented
3. **Responsive Design**: Uses Tailwind's responsive classes for mobile/desktop support
4. **Bilingual Content**: Maintains Japanese-Chinese translations throughout

## Adding New Flashcards

To add flashcards, modify the `initialFlashcards` array in `src/App.tsx` (lines 5-16). Each card requires:
```javascript
{
  id: number,
  lesson: number,
  word: string,
  reading: string,
  meaning: string,
  level: string,
  example: string,
  exampleCN: string,
  romaji: string
}
```

## File Extension Note

The main component uses `.tsx` extension but doesn't use TypeScript - it's plain JSX. This is acceptable as React tooling supports both extensions.

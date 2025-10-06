/**
 * 加载单词卡片数据
 */
export const loadFlashcards = async () => {
  try {
    const response = await fetch('/data/flashcards.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load flashcards:', error);
    throw error;
  }
};

/**
 * 将课程数据转换为扁平化的单词卡片列表
 */
export const transformLessonsToCards = (lessonsData) => {
  if (!lessonsData || !lessonsData.lessons) {
    return [];
  }

  const cards = [];
  lessonsData.lessons.forEach(lesson => {
    if (lesson.cards && Array.isArray(lesson.cards)) {
      lesson.cards.forEach(card => {
        cards.push({
          ...card,
          lesson: lesson.lessonNumber,
          lessonName: lesson.lessonName
        });
      });
    }
  });

  return cards;
};

/**
 * 初始化 SRS 数据
 */
export const initializeSRSData = (cards) => {
  return cards.map(card => ({
    ...card,
    status: 'learning',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
    correctCount: 0,
    incorrectCount: 0
  }));
};

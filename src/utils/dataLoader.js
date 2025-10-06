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
 * @param {Object} lessonsData - 包含lessons数组的数据对象
 * @param {number|null} lessonNumber - 可选,指定要提取的课程号,null表示提取所有课程
 */
export const transformLessonsToCards = (lessonsData, lessonNumber = null) => {
  if (!lessonsData || !lessonsData.lessons) {
    return [];
  }

  const cards = [];
  lessonsData.lessons.forEach(lesson => {
    // 如果指定了课程号,只处理该课程
    if (lessonNumber !== null && lesson.lessonNumber !== lessonNumber) {
      return;
    }

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
 * 获取所有可用的课程列表
 */
export const getAvailableLessons = (lessonsData) => {
  if (!lessonsData || !lessonsData.lessons) {
    return [];
  }

  return lessonsData.lessons.map(lesson => ({
    lessonNumber: lesson.lessonNumber,
    lessonName: lesson.lessonName,
    cardCount: lesson.cards ? lesson.cards.length : 0
  }));
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

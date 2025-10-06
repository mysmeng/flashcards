import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff, Target, Check, X, BarChart3, Brain, BookOpen } from 'lucide-react';
import { loadFlashcards, transformLessonsToCards, initializeSRSData, getAvailableLessons } from './utils/dataLoader';

const FlashcardApp = () => {
  const [srsData, setSRSData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('auto');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [mode, setMode] = useState('normal');
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [availableLessons, setAvailableLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const japaneseVoices = voices.filter(voice => voice.lang.startsWith('ja'));
      setAvailableVoices(japaneseVoices);
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // 加载单词数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await loadFlashcards();
        setRawData(data);

        // 获取可用课程列表
        const lessons = getAvailableLessons(data);
        setAvailableLessons(lessons);

        // 默认选择第一个课程
        if (lessons.length > 0) {
          const firstLesson = lessons[0].lessonNumber;
          setSelectedLesson(firstLesson);
          const cards = transformLessonsToCards(data, firstLesson);
          const initializedData = initializeSRSData(cards);
          setSRSData(initializedData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading flashcards:', err);
        setError('加载数据失败,请刷新页面重试');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getFilteredCards = () => {
    let filtered = [...srsData];
    
    if (mode === 'focus') {
      filtered = filtered.filter(card => card.status !== 'mastered');
    }
    
    filtered.sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
    
    return filtered;
  };

  const filteredCards = getFilteredCards();
  const currentCard = filteredCards[currentIndex] || srsData[0];

  const calculateNextReview = (quality, card) => {
    let interval = card.interval;
    let easeFactor = card.easeFactor;
    let repetitions = card.repetitions;
    
    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else {
      repetitions = 0;
      interval = 1;
    }
    
    easeFactor = Math.max(1.3, easeFactor);
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    let status = 'learning';
    if (repetitions >= 3 && interval >= 21) {
      status = 'mastered';
    } else if (repetitions >= 1) {
      status = 'reviewing';
    }
    
    return {
      interval,
      easeFactor,
      repetitions,
      nextReview: nextReview.toISOString(),
      status
    };
  };

  const handleFeedback = (isCorrect) => {
    const quality = isCorrect ? 5 : 2;
    const updatedReview = calculateNextReview(quality, currentCard);
    
    const newSRSData = srsData.map(card => {
      if (card.id === currentCard.id) {
        return {
          ...card,
          ...updatedReview,
          lastReview: new Date().toISOString(),
          correctCount: isCorrect ? card.correctCount + 1 : card.correctCount,
          incorrectCount: isCorrect ? card.incorrectCount : card.incorrectCount + 1
        };
      }
      return card;
    });
    
    setSRSData(newSRSData);
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1)
    }));
    
    setShowAnswer(false);
    nextCard();
  };

  const speakJapanese = (text) => {
    if (!window.speechSynthesis) {
      alert('您的浏览器不支持语音功能');
      return;
    }
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = speechSynthesis.getVoices();
    const japaneseVoices = voices.filter(voice => voice.lang.startsWith('ja'));
    
    if (selectedVoice !== 'auto') {
      const chosenVoice = japaneseVoices.find(voice => voice.name === selectedVoice);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
    } else if (japaneseVoices.length > 0) {
      utterance.voice = japaneseVoices[0];
    }
    
    setTimeout(() => {
      speechSynthesis.speak(utterance);
    }, 100);
  };

  const nextCard = () => {
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setShowAnswer(false);
    setIsFlipped(false);
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(filteredCards.length - 1);
    }
    setShowAnswer(false);
    setIsFlipped(false);
  };

  // 触摸滑动处理
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
    // 阻止页面滚动
    if (touchStart) {
      const distance = Math.abs(touchStart - e.targetTouches[0].clientX);
      if (distance > 10) {
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextCard();
    }
    if (isRightSwipe) {
      prevCard();
    }
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  const resetProgress = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsFlipped(false);
    setSessionStats({ correct: 0, incorrect: 0 });
  };

  // 切换课程
  const handleLessonChange = (lessonNumber) => {
    if (!rawData) return;

    setSelectedLesson(lessonNumber);
    const cards = transformLessonsToCards(rawData, lessonNumber);
    const initializedData = initializeSRSData(cards);
    setSRSData(initializedData);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsFlipped(false);
    setSessionStats({ correct: 0, incorrect: 0 });
  };

  const getStatusColor = (status) => {
    if (status === 'learning') return 'bg-yellow-100 text-yellow-700';
    if (status === 'reviewing') return 'bg-blue-100 text-blue-700';
    if (status === 'mastered') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    if (status === 'learning') return '学习中';
    if (status === 'reviewing') return '复习中';
    if (status === 'mastered') return '已掌握';
    return '未知';
  };

  const stats = {
    total: srsData.length,
    learning: srsData.filter(c => c.status === 'learning').length,
    reviewing: srsData.filter(c => c.status === 'reviewing').length,
    mastered: srsData.filter(c => c.status === 'mastered').length,
    accuracy: sessionStats.correct + sessionStats.incorrect > 0
      ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
      : 0
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">加载单词数据中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-red-600 mb-4">
            <X size={64} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  // 数据为空
  if (srsData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <BookOpen size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">暂无数据</h2>
          <p className="text-gray-600">请添加单词卡片到 /public/data/flashcards.json</p>
        </div>
      </div>
    );
  }


  if (mode === 'stats') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 size={32} />
                学习统计
              </h2>
              <button
                onClick={() => setMode('normal')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                返回学习
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-600">总单词数</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-700">{stats.learning}</div>
                <div className="text-sm text-yellow-600">学习中</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-700">{stats.reviewing}</div>
                <div className="text-sm text-blue-600">复习中</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-700">{stats.mastered}</div>
                <div className="text-sm text-green-600">已掌握</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">本次学习统计</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                  <div className="text-sm text-gray-600">答对</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{sessionStats.incorrect}</div>
                  <div className="text-sm text-gray-600">答错</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats.accuracy}%</div>
                  <div className="text-sm text-gray-600">准确率</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-800 mb-3">课程进度</h3>
              {availableLessons.map(lesson => {
                const lessonCards = srsData.filter(c => c.lesson === lesson.lessonNumber);
                const lessonMastered = lessonCards.filter(c => c.status === 'mastered').length;
                const isCurrentLesson = lesson.lessonNumber === selectedLesson;

                return (
                  <div key={lesson.lessonNumber} className={'bg-gray-50 p-4 rounded-lg ' + (isCurrentLesson ? 'ring-2 ring-indigo-500' : '')}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        第{lesson.lessonNumber}课: {lesson.lessonName}
                      </span>
                      <span className="text-sm text-gray-600">
                        {isCurrentLesson ? `${lessonMastered} / ${lessonCards.length}` : `${lesson.cardCount}个单词`}
                      </span>
                    </div>
                    {isCurrentLesson && (
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all"
                          style={{ width: lessonCards.length > 0 ? ((lessonMastered / lessonCards.length) * 100) + '%' : '0%' }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">日语单词闪卡</h1>
          <p className="text-gray-600">SRS间隔重复学习系统</p>

          {/* 课程选择器 */}
          {availableLessons.length > 0 && (
            <div className="mt-4 mb-4 w-full px-2">
              <select
                value={selectedLesson || ''}
                onChange={(e) => handleLessonChange(Number(e.target.value))}
                className="w-full max-w-md mx-auto block px-4 py-3 bg-white border-2 border-indigo-300 rounded-lg text-base md:text-lg font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition-colors"
              >
                {availableLessons.map(lesson => (
                  <option key={lesson.lessonNumber} value={lesson.lessonNumber}>
                    第{lesson.lessonNumber}课: {lesson.lessonName} ({lesson.cardCount}个单词)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {availableVoices.length > 0 && (
              <select 
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="auto">自动语音</option>
                {availableVoices.map((voice, index) => (
                  <option key={index} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setMode(mode === 'focus' ? 'normal' : 'focus')}
              className={'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ' + (mode === 'focus' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300')}
            >
              <Target size={18} />
              {mode === 'focus' ? '退出专注' : '专注模式'}
            </button>

            <button
              onClick={() => setMode('stats')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              <BarChart3 size={18} />
              统计
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className={'text-sm font-semibold px-3 py-1 rounded-full ' + getStatusColor(currentCard.status)}>
                {getStatusText(currentCard.status)}
              </span>
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                {currentCard.level}
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                <BookOpen size={14} />
                第{currentCard.lesson}课
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {filteredCards.length}
            </span>
          </div>

          {mode === 'focus' && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-700 font-medium">
                  未掌握: {stats.learning + stats.reviewing}
                </span>
                <span className="text-orange-600">
                  准确率: {stats.accuracy}%
                </span>
              </div>
            </div>
          )}

          <div
            className={'flip-card ' + (isFlipped ? 'flipped' : '')}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ touchAction: 'pan-y pinch-zoom' }}
          >
            <div className="flip-card-inner min-h-[350px]">
              {/* 卡片正面 - 问题 */}
              <div className="flip-card-front">
                <div
                  className="min-h-[350px] flex flex-col items-center justify-center cursor-pointer select-none"
                  onClick={handleCardClick}
                >
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <h2 className="text-5xl font-bold text-gray-800">{currentCard.word}</h2>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(currentCard.reading);
                        }}
                        className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors"
                      >
                        <Volume2 size={24} />
                      </button>
                    </div>
                    <p className="text-2xl text-gray-600 mb-2">{currentCard.reading}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <EyeOff size={20} />
                    <p className="text-lg">点击卡片查看答案</p>
                  </div>
                </div>
              </div>

              {/* 卡片背面 - 答案 */}
              <div className="flip-card-back">
                <div
                  className="min-h-[350px] flex flex-col items-center justify-center cursor-pointer select-none"
                  onClick={handleCardClick}
                >
                  <div className="text-center w-full">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-4">
                      <p className="text-3xl font-semibold text-indigo-700 mb-6">
                        {currentCard.meaning}
                      </p>
                      <div className="border-t border-indigo-200 pt-4">
                        <p className="text-sm text-gray-500 mb-3">例句 Example</p>
                        <p className="text-base text-gray-800 font-semibold mb-2">{currentCard.exampleCN}</p>
                        <p className="text-lg text-gray-700 mb-2">{currentCard.example}</p>
                        <p className="text-sm text-indigo-600 italic mb-3">{currentCard.romaji}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakJapanese(currentCard.example);
                          }}
                          className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                          <Volume2 size={16} />
                          听例句
                        </button>
                      </div>
                    </div>

                    {mode === 'focus' && (
                      <div className="flex gap-3 justify-center mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(false);
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          <X size={20} />
                          不会
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(true);
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          <Check size={20} />
                          记住了
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-gray-400 mt-4">
                      <Eye size={20} />
                      <p className="text-sm">点击卡片返回</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center mb-4">
          <button
            onClick={prevCard}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors"
          >
            <ChevronLeft size={20} />
            上一个
          </button>
          <button
            onClick={resetProgress}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors"
          >
            <RotateCcw size={20} />
            重置
          </button>
          <button
            onClick={nextCard}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-colors"
          >
            下一个
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: filteredCards.length > 0 ? (((currentIndex + 1) / filteredCards.length) * 100) + '%' : '0%' }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>进度: {currentIndex + 1}/{filteredCards.length}</span>
            <span>准确率: {stats.accuracy}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardApp;
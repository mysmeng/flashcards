import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff, Target, Check, X, BarChart3, Brain, BookOpen } from 'lucide-react';

const FlashcardApp = () => {
  const initialFlashcards = [
    { id: 1, lesson: 11, word: '電気屋', reading: 'でんきや', meaning: '电器商店', level: 'N5', example: '電気屋で新しいテレビを買いました。', exampleCN: '我在电器店买了新电视。', romaji: 'den-ki-ya de a-ta-ra-shii te-re-bi o ka-i-ma-shi-ta' },
    { id: 2, lesson: 11, word: 'ほしい', reading: 'ほしい', meaning: '想要、希望得到', level: 'N5', example: '新しいカメラがほしいです。', exampleCN: '我想要新相机。', romaji: 'a-ta-ra-shii ka-me-ra ga ho-shii de-su' },
    { id: 3, lesson: 11, word: '得', reading: 'とく', meaning: '划算，好处', level: 'N3', example: 'このセールは得ですね。', exampleCN: '这次促销很划算呢。', romaji: 'ko-no se-e-ru wa to-ku de-su ne' },
    { id: 4, lesson: 11, word: '性能', reading: 'せいのう', meaning: '性能', level: 'N3', example: 'このパソコンは性能がいいです。', exampleCN: '这台电脑性能很好。', romaji: 'ko-no pa-so-kon wa se-i-no-u ga i-i de-su' },
    { id: 5, lesson: 11, word: '白い', reading: 'しろい', meaning: '白色的', level: 'N5', example: '白いシャツを着ています。', exampleCN: '我穿着白衬衫。', romaji: 'shi-ro-i sha-tsu o ki-te i-ma-su' },
    { id: 6, lesson: 11, word: '重さ', reading: 'おもさ', meaning: '重量', level: 'N5', example: 'この荷物の重さはどれくらいですか。', exampleCN: '这个行李有多重？', romaji: 'ko-no ni-mo-tsu no o-mo-sa wa do-re-ku-ra-i de-su ka' },
    { id: 7, lesson: 11, word: 'どれくらい', reading: 'どれくらい', meaning: '多少', level: 'N5', example: '時間はどれくらいかかりますか。', exampleCN: '需要多长时间？', romaji: 'ji-kan wa do-re-ku-ra-i ka-ka-ri-ma-su ka' },
    { id: 8, lesson: 11, word: 'キロ', reading: 'キロ', meaning: '千克、千米', level: 'N5', example: '体重は60キロです。', exampleCN: '体重是60公斤。', romaji: 'ta-i-juu wa ro-ku-juu ki-ro de-su' },
    { id: 9, lesson: 11, word: 'ちょっと', reading: 'ちょっと', meaning: '稍微，一点儿', level: 'N5', example: 'ちょっと待ってください。', exampleCN: '请稍等一下。', romaji: 'cho-tto ma-tte ku-da-sa-i' },
    { id: 10, lesson: 11, word: '重い', reading: 'おもい', meaning: '沉重的', level: 'N5', example: 'このスーツケースは重いです。', exampleCN: '这个行李箱很重。', romaji: 'ko-no su-u-tsu-ke-e-su wa o-mo-i de-su' }
  ];

  const initializeSRSData = () => {
    return initialFlashcards.map(card => ({
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

  const [srsData, setSRSData] = useState(initializeSRSData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('auto');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [mode, setMode] = useState('normal');
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });

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
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(filteredCards.length - 1);
    }
    setShowAnswer(false);
  };

  const resetProgress = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">第11课</span>
                  <span className="text-sm text-gray-600">{stats.mastered} / {stats.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all"
                    style={{ width: stats.total > 0 ? ((stats.mastered / stats.total) * 100) + '%' : '0%' }}
                  ></div>
                </div>
              </div>
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
          <p className="text-gray-600">SRS间隔重复学习系统 - 第11课</p>
          
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
            className="min-h-[350px] flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setShowAnswer(!showAnswer)}
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

            {showAnswer ? (
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
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <EyeOff size={20} />
                <p className="text-lg">点击查看答案</p>
              </div>
            )}
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
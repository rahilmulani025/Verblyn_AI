import { homeApi } from '../src/features/home/home.api';
import { progressApi } from '../src/features/progress/progress.api';
import { challengeApi } from '../src/features/challenges/challenge.api';

async function testApis() {
  console.log('=== TESTING API RUNTIME SAFETY ===');

  try {
    const challenges = await challengeApi.getChallenges();
    console.log('✅ challengeApi.getChallenges() returned:', challenges.length, 'challenges');
  } catch (err) {
    console.error('❌ challengeApi.getChallenges() threw:', err);
  }

  try {
    const dailyMission = await challengeApi.getDailyMission();
    console.log('✅ challengeApi.getDailyMission() returned:', dailyMission?.challenge.title);
  } catch (err) {
    console.error('❌ challengeApi.getDailyMission() threw:', err);
  }

  try {
    const homeData = await homeApi.getLearningHomeData();
    console.log('✅ homeApi.getLearningHomeData() returned:', homeData.userName, '| streak:', homeData.streak.currentStreak);
  } catch (err) {
    console.error('❌ homeApi.getLearningHomeData() threw:', err);
  }

  try {
    const progressData = await progressApi.getProgress();
    console.log('✅ progressApi.getProgress() returned:', progressData.skills.length, 'skills | mastery:', progressData.overallMasteryScore);
  } catch (err) {
    console.error('❌ progressApi.getProgress() threw:', err);
  }
}

testApis();

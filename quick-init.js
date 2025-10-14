// 브라우저 콘솔에서 실행할 스크립트
fetch('http://localhost:3007/api/economic-entities/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log('✅ 성공!', data.message);
    console.log('생성된 경제 기구:', data.created_types);
    console.log('생성된 계좌 수:', data.accounts_created);
    alert('✅ ' + data.message);
  } else {
    console.error('❌ 오류:', data.error);
    alert('❌ ' + data.error);
  }
})
.catch(err => {
  console.error('연결 오류:', err);
  alert('❌ 서버 연결 실패');
});

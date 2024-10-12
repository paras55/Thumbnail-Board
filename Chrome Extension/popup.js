document.addEventListener('DOMContentLoaded', function() {
  fetch('http://localhost:5000/api/boards')
    .then(response => response.json())
    .then(boards => {
      const select = document.getElementById('boardSelect');
      boards.forEach(board => {
        const option = document.createElement('option');
        option.value = board.id;
        option.textContent = board.name;
        select.appendChild(option);
      });
    });

  document.getElementById('boardSelect').addEventListener('change', function(e) {
    chrome.storage.sync.set({selectedBoard: e.target.value});
  });
});
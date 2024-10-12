function extractVideoId(videoElement) {
    // Method 1: Try to find the video ID in the thumbnail link
    const thumbnailLink = videoElement.querySelector('a#thumbnail');
    if (thumbnailLink && thumbnailLink.href) {
        const match = thumbnailLink.href.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\n]+)/);
        if (match && match[1]) {
            return match[1];
        }
    }

    // Method 2: Check for data-video-id attribute
    const videoIdElement = videoElement.querySelector('[data-video-id]');
    if (videoIdElement && videoIdElement.dataset.videoId) {
        return videoIdElement.dataset.videoId;
    }

    // Method 3: Look for the video ID in any href attribute
    const allLinks = videoElement.querySelectorAll('a');
    for (const link of allLinks) {
        const match = link.href.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\n]+)/);
        if (match && match[1]) {
            return match[1];
        }
    }

    // Method 4: Parse the video ID from the page URL (for single video pages)
    const pageUrl = window.location.href;
    const pageUrlMatch = pageUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\n]+)/);
    if (pageUrlMatch && pageUrlMatch[1]) {
        return pageUrlMatch[1];
    }

    // If still not found, return null
    return null;
}

function addSaveIcon(videoElement) {
    // Check if we've already added an icon to this element
    if (videoElement.querySelector('.save-thumbnail-icon')) return;
  
    const titleElement = videoElement.querySelector('#video-title');
    if (!titleElement) return;
  
    const saveIcon = document.createElement('span');
    saveIcon.innerHTML = '&#128190;'; // Unicode for floppy disk icon
    saveIcon.className = 'save-thumbnail-icon';
    saveIcon.style.cursor = 'pointer';
    saveIcon.style.marginLeft = '5px';
    saveIcon.style.fontSize = '14px';
    saveIcon.title = 'Save Thumbnail';
  
    saveIcon.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            const videoId = extractVideoId(videoElement);
            if (videoId) {
                chrome.storage.sync.get('selectedBoard', function(data) {
                    const boardId = data.selectedBoard;
                    if (boardId) {
                        saveThumbnail(videoId, boardId);
                    } else {
                        alert('Please select a board first.');
                    }
                });
            } else {
                console.error('Failed to extract video ID');
                alert('Failed to extract video ID. Please try again or report this issue.');
            }
        } catch (error) {
            console.error('Error extracting video ID:', error);
            alert('An error occurred while extracting the video ID. Please try again or report this issue.');
        }
    });
  
    titleElement.appendChild(saveIcon);
}

function saveThumbnail(videoId, boardId) {
    fetch('http://localhost:5000/api/save_thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: videoId,
        board_id: boardId
      }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Thumbnail saved successfully!');
      } else {
        alert('Failed to save thumbnail: ' + data.error);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while saving the thumbnail.');
    });
}

function addSaveIconsToPage() {
    const videoElements = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer');
    videoElements.forEach(addSaveIcon);
}

// Use a MutationObserver to handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node.matches('ytd-rich-item-renderer') || node.matches('ytd-video-renderer'))) {
            addSaveIcon(node);
          }
        });
      }
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, { childList: true, subtree: true });

// Initial run for already loaded videos
addSaveIconsToPage();
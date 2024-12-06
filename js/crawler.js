let currentAudio = null;
let currentContainer = null;

function togglePlay(audioUrl, container) {
  if (currentAudio && currentContainer) {
    currentAudio.pause();
    currentContainer.classList.remove('playing');
    if (currentAudio.src === audioUrl && container === currentContainer) {
      currentAudio = null;
      currentContainer = null;
      return;
    }
  }

  currentAudio = new Audio(audioUrl);
  currentContainer = container;
  currentContainer.classList.add('playing');

  currentAudio.play();

  currentAudio.onended = () => {
    currentContainer.classList.remove('playing');
    currentAudio = null;
    currentContainer = null;
  };
}

async function startCrawl() {
  const url = document.getElementById('url').value;
  const releasesDiv = document.getElementById('releases');
  releasesDiv.innerHTML = '';

  const response = await fetch('https://map.deejay.tools/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ url }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data.startsWith(':')) continue;

        try {
          const json = JSON.parse(data);
          const release = json.release;
          const collectedBy = json.collected_by;

          const releaseElement = document.createElement('div');
          releaseElement.className = 'release';
          releaseElement.innerHTML = `
                        <div class="cover-container" onclick="togglePlay('${
                          release.streaming_url
                        }', this)">
                            <img src="${release.image_url}" alt="${
            release.title
          }">
                            <div class="play-button">
                                <svg viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            </div>
                        </div>
                        <h3><a href="${release.url}" target="_blank">${
            release.title
          }</a></h3>
                        <p>by ${release.artist}</p>
                        <p>📍 ${release.location}</p>
                        <p>🎵 ${release.release_type}</p>
                        <p>📅 ${new Date(
                          release.release_date
                        ).toLocaleDateString()}</p>
                        <div class="genres">
                            ${release.genres
                              .map(
                                (genre) => `<span class="genre">${genre}</span>`
                              )
                              .join('')}
                        </div>
                        <p>Found via: <a href="${
                          collectedBy.bandcamp_url
                        }" target="_blank">${collectedBy.name}</a></p>
                    `;

          releasesDiv.appendChild(releaseElement);
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      }
    }
  }
}

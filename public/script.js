const RESULTS_PER_PAGE = 10;
let currentPage = 0;
let currentQuery = '';

const searchInput = document.getElementById('searchInput');
const lawTypeFilter = document.getElementById('lawType');
const yearFilter = document.getElementById('yearFilter');
const resultsDiv = document.getElementById('results');
const paginationDiv = document.getElementById('pagination');

function init() {
    setupEventListeners();
    populateYearFilter();
}

function setupEventListeners() {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchLaw();
        }
    });
}

function populateYearFilter() {
    const currentYear = new Date().getFullYear();
    const startYear = 1950; 

    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    }
}

async function searchLaw(page = 0) {
    currentPage = page;
    currentQuery = searchInput.value.trim();

    if (!currentQuery) {
        showError('Please enter a search term');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: currentQuery,
                page: currentPage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.docs || data.docs.length === 0) {
            showNoResults();
            return;
        }

        displayResults(data);

        const totalMatch = data.found?.match(/of (\d+)/);
        const totalResults = totalMatch ? parseInt(totalMatch[1]) : data.docs.length;
        setupPagination(totalResults);

    } catch (error) {
        console.error('Search error:', error);
        showError(error.message || 'Failed to fetch results. Please try again later.');
    }
}

function displayResults(data) {
    resultsDiv.innerHTML = '';

    data.docs.forEach(doc => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        const cleanTitle = doc.title ? doc.title.replace(/<[^>]*>/g, '') : 'Untitled Document';
        const cleanHeadline = doc.headline ? doc.headline.replace(/<[^>]*>/g, '') : 'No content preview available.';

        const displayDate = doc.publishdate ?
            new Date(doc.publishdate).toLocaleDateString('en-IN') :
            'Date not available';

        resultItem.innerHTML = `
            <h3>${cleanTitle}</h3>
            <div class="snippet">${cleanHeadline}</div>
            <div class="meta">
                <span><i class="fas fa-calendar-alt"></i> ${displayDate}</span>
                ${doc.docsource ? `<span><i class="fas fa-gavel"></i> ${doc.docsource}</span>` : ''}
                ${doc.author ? `<span><i class="fas fa-user"></i> ${doc.author}</span>` : ''}
            </div>
            <div class="result-actions">
                <button class="btn btn-primary" onclick="viewFullDocument('${doc.tid}')">
                    <i class="fas fa-external-link-alt"></i> View Full Text
                </button>
                <button class="btn btn-secondary" onclick="copyCitation('${doc.tid}', '${cleanTitle.replace(/'/g, "\\'")}', '${doc.docsource ? doc.docsource.replace(/'/g, "\\'") : ''}', '${doc.publishdate || ''}')">
                    <i class="fas fa-quote-right"></i> Copy Citation
                </button>
                <button class="btn btn-bookmark" data-doc-id="${doc.tid}" onclick="toggleBookmark('${doc.tid}', '${cleanTitle.replace(/'/g, "\\'")}')">
                    <i class="far fa-bookmark"></i> Bookmark
                </button>
            </div>
        `;

        resultsDiv.appendChild(resultItem);
    });
}

function setupPagination(totalResults) {
    paginationDiv.innerHTML = '';

    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    if (totalPages <= 1) return;

    if (currentPage > 0) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
        prevBtn.onclick = () => searchLaw(currentPage - 1);
        paginationDiv.appendChild(prevBtn);
    }

    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    if (startPage > 0) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => searchLaw(0);
        paginationDiv.appendChild(firstBtn);

        if (startPage > 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 12px';
            paginationDiv.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i + 1;
        if (i === currentPage) {
            pageBtn.className = 'active';
        }
        pageBtn.onclick = () => searchLaw(i);
        paginationDiv.appendChild(pageBtn);
    }

    if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 12px';
            paginationDiv.appendChild(ellipsis);
        }

        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => searchLaw(totalPages - 1);
        paginationDiv.appendChild(lastBtn);
    }

    if (currentPage < totalPages - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => searchLaw(currentPage + 1);
        paginationDiv.appendChild(nextBtn);
    }
}

function viewFullDocument(docId) {
    if (!docId) return;
    window.open(`https://indiankanoon.org/doc/${docId}/`, '_blank');
}

function copyCitation(docId, title, court, date) {
    const citation = generateCitation(title, court, date);
    navigator.clipboard.writeText(citation)
        .then(() => {
            alert('Citation copied to clipboard:\n' + citation);
        })
        .catch(err => {
            console.error('Failed to copy citation:', err);
            alert('Failed to copy citation. Please try again.');
        });
}

function generateCitation(title, court, date) {
    const courtAbbr = {
        'Supreme Court': 'SC',
        'Delhi High Court': 'Del HC',
        'Bombay High Court': 'Bom HC',
        'Madras High Court': 'Mad HC',
        'Calcutta High Court': 'Cal HC',
        'Allahabad High Court': 'All HC',
        'Karnataka High Court': 'Kar HC'
    };

    const shortCourt = courtAbbr[court] || court;
    const year = date ? new Date(date).getFullYear() : '';

    return `${title}, ${shortCourt} ${year}`;
}

function toggleBookmark(docId, docTitle) {
    if (!docId) return;

    let bookmarks = JSON.parse(localStorage.getItem('lawToolBookmarks')) || [];
    const index = bookmarks.findIndex(b => b.id === docId);

    if (index === -1) {
        bookmarks.push({
            id: docId,
            title: docTitle,
            timestamp: new Date().toISOString()
        });
    } else {
        bookmarks.splice(index, 1);
    }

    localStorage.setItem('lawToolBookmarks', JSON.stringify(bookmarks));
    updateBookmarkButton(docId);
}

function updateBookmarkButton(docId) {
    if (!docId) return;

    const bookmarks = JSON.parse(localStorage.getItem('lawToolBookmarks') || []);
    const isBookmarked = bookmarks.some(b => b.id === docId);

    const buttons = document.querySelectorAll(`.btn-bookmark[data-doc-id="${docId}"]`);
    buttons.forEach(btn => {
        btn.innerHTML = isBookmarked
            ? '<i class="fas fa-bookmark"></i> Bookmarked'
            : '<i class="far fa-bookmark"></i> Bookmark';
        btn.className = isBookmarked
            ? 'btn btn-bookmark bookmarked'
            : 'btn btn-bookmark';
    });
}


function showLoading() {
    resultsDiv.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Searching Indian legal databases...</p>
        </div>
    `;
    paginationDiv.innerHTML = '';
}

function showError(message) {
    resultsDiv.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
    paginationDiv.innerHTML = '';
}

function showNoResults() {
    resultsDiv.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search"></i>
            <p>No results found for "${currentQuery}"</p>
            <p>Try different search terms or check your spelling.</p>
        </div>
    `;
    paginationDiv.innerHTML = '';
}

function clearResults() {
    searchInput.value = '';
    resultsDiv.innerHTML = '';
    paginationDiv.innerHTML = '';
    currentQuery = '';
    currentPage = 0;
}

function showBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('lawToolBookmarks')) || [];
    const bookmarksList = document.getElementById('bookmarks-list');
    bookmarksList.innerHTML = '';

    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<p>No bookmarks saved.</p>';
    } else {
        bookmarks.forEach(bookmark => {
            const bookmarkItem = document.createElement('div');
            bookmarkItem.innerHTML = `
                <h3>${bookmark.title}</h3>
                <button onclick="viewFullDocument('${bookmark.id}')">View Document</button>
            `;
            bookmarksList.appendChild(bookmarkItem);
        });
    }

    document.getElementById('bookmarks-modal').style.display = 'block';
}

function closeBookmarks() {
    document.getElementById('bookmarks-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
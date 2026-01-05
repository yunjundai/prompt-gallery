/**
 * 提示詞圖庫應用程式
 * 使用 Google Apps Script Web App 作為後端
 */

// ================================
// 全域狀態
// ================================
let state = {
    items: [],
    categories: [],
    isAdmin: false,
    currentCategory: 'all',
    searchQuery: ''
}

// ================================
// GAS API 呼叫
// ================================

/**
 * GET 請求封裝
 */
async function gasGet(action) {
    const url = `${GOOGLE_CONFIG.GAS_WEB_APP_URL}?action=${action}`
    const response = await fetch(url)
    return response.json()
}

/**
 * POST 請求封裝
 */
async function gasPost(action, data = {}) {
    const response = await fetch(GOOGLE_CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...data })
    })
    return response.json()
}

// ================================
// 資料操作
// ================================

/**
 * 載入所有資料
 */
async function loadData() {
    try {
        showLoading('正在載入資料...')

        const [itemsResult, categoriesResult] = await Promise.all([
            gasGet('getItems'),
            gasGet('getCategories')
        ])

        if (itemsResult.error) {
            throw new Error(itemsResult.error)
        }
        if (categoriesResult.error) {
            throw new Error(categoriesResult.error)
        }

        state.items = itemsResult
        state.categories = categoriesResult

        renderCategoryTabs()
        renderGallery()
        hideLoading()

    } catch (error) {
        console.error('載入資料失敗:', error)
        hideLoading()
        showToast('載入資料失敗: ' + error.message, 'error')
    }
}

/**
 * 新增項目
 */
async function addItem(item) {
    try {
        showLoading('正在新增...')
        const result = await gasPost('addItem', { item })

        if (result.error) {
            throw new Error(result.error)
        }

        await loadData()
        showToast('新增成功！', 'success')
        return result

    } catch (error) {
        hideLoading()
        showToast('新增失敗: ' + error.message, 'error')
        throw error
    }
}

/**
 * 更新項目
 */
async function updateItem(item) {
    try {
        showLoading('正在更新...')
        const result = await gasPost('updateItem', { item })

        if (result.error) {
            throw new Error(result.error)
        }

        await loadData()
        showToast('更新成功！', 'success')
        return result

    } catch (error) {
        hideLoading()
        showToast('更新失敗: ' + error.message, 'error')
        throw error
    }
}

/**
 * 刪除項目
 */
async function deleteItem(id) {
    try {
        showLoading('正在刪除...')
        const result = await gasPost('deleteItem', { id })

        if (result.error) {
            throw new Error(result.error)
        }

        await loadData()
        showToast('刪除成功！', 'success')
        return result

    } catch (error) {
        hideLoading()
        showToast('刪除失敗: ' + error.message, 'error')
        throw error
    }
}

/**
 * 新增分類
 */
async function addCategoryToSheet(name) {
    try {
        const result = await gasPost('addCategory', { name })

        if (result.error) {
            throw new Error(result.error)
        }

        await loadData()
        showToast('分類新增成功！', 'success')
        return result

    } catch (error) {
        showToast('分類新增失敗: ' + error.message, 'error')
        throw error
    }
}

/**
 * 刪除分類
 */
async function deleteCategoryFromSheet(id) {
    try {
        const result = await gasPost('deleteCategory', { id })

        if (result.error) {
            throw new Error(result.error)
        }

        await loadData()
        showToast('分類刪除成功！', 'success')
        return result

    } catch (error) {
        showToast('分類刪除失敗: ' + error.message, 'error')
        throw error
    }
}

/**
 * 更新排序
 */
async function updateSortOrder(items) {
    try {
        showLoading('正在儲存排序...')
        const result = await gasPost('updateOrder', { items })

        if (result.error) {
            throw new Error(result.error)
        }

        await loadData()
        showToast('排序已儲存！', 'success')
        return result

    } catch (error) {
        hideLoading()
        showToast('排序儲存失敗: ' + error.message, 'error')
        throw error
    }
}

/**
 * 上傳圖片到 Google Drive (透過 GAS)
 */
async function uploadImageToGAS(base64Data, filename) {
    try {
        const result = await gasPost('uploadImage', { base64: base64Data, filename })

        if (result.error) {
            throw new Error(result.error)
        }

        return result.imageUrl

    } catch (error) {
        showToast('圖片上傳失敗: ' + error.message, 'error')
        throw error
    }
}

// ================================
// UI 渲染
// ================================

/**
 * 渲染分類頁籤
 */
function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs')

    let html = `<button class="category-tab ${state.currentCategory === 'all' ? 'active' : ''}" 
                        onclick="filterByCategory('all')">全部</button>`

    state.categories.forEach(cat => {
        html += `<button class="category-tab ${state.currentCategory === cat.id ? 'active' : ''}" 
                         onclick="filterByCategory('${cat.id}')">${cat.name}</button>`
    })

    container.innerHTML = html
}

/**
 * 篩選分類
 */
function filterByCategory(categoryId) {
    state.currentCategory = categoryId
    renderCategoryTabs()
    renderGallery()
}

/**
 * 取得篩選後的項目
 */
function getFilteredItems() {
    let items = [...state.items]

    // 分類篩選
    if (state.currentCategory !== 'all') {
        items = items.filter(item => {
            if (Array.isArray(item.categories)) {
                return item.categories.includes(state.currentCategory)
            }
            return false
        })
    }

    // 搜尋篩選
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase()
        items = items.filter(item =>
            item.prompt && item.prompt.toLowerCase().includes(query)
        )
    }

    // 按 order 排序
    items.sort((a, b) => (a.order || 0) - (b.order || 0))

    return items
}

/**
 * 渲染圖庫
 */
function renderGallery() {
    const gallery = document.getElementById('gallery')
    const emptyState = document.getElementById('emptyState')
    const items = getFilteredItems()

    if (items.length === 0) {
        gallery.innerHTML = ''
        emptyState.classList.remove('hidden')
        return
    }

    emptyState.classList.add('hidden')

    gallery.innerHTML = items.map(item => `
        <div class="gallery-card" data-id="${item.id}">
            <div class="card-image" onclick="openImageModal('${escapeHtml(item.imageUrl)}', '${escapeHtml(item.prompt)}')">
                <img src="${item.imageUrl}" alt="提示詞圖片" loading="lazy" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23333%22 width=%22200%22 height=%22200%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>圖片載入失敗</text></svg>'">
            </div>
            <div class="card-content">
                <p class="card-prompt">${escapeHtml(item.prompt)}</p>
                <div class="card-categories">
                    ${getCategoryNames(item.categories).map(name =>
        `<span class="category-badge">${name}</span>`
    ).join('')}
                </div>
                <button class="btn btn-sm btn-ghost copy-btn" onclick="copyPrompt('${escapeHtml(item.prompt)}')">
                    📋 複製提示詞
                </button>
                ${state.isAdmin ? `
                    <div class="card-admin-actions">
                        <button class="btn btn-sm btn-warning" onclick="openEditModal('${item.id}')">✏️ 編輯</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmDelete('${item.id}')">🗑️ 刪除</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('')
}

/**
 * 取得分類名稱
 */
function getCategoryNames(categoryIds) {
    if (!categoryIds || !Array.isArray(categoryIds)) return []
    return categoryIds.map(id => {
        const cat = state.categories.find(c => c.id === id)
        return cat ? cat.name : id
    })
}

/**
 * 複製提示詞
 */
function copyPrompt(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('提示詞已複製！', 'success')
    }).catch(err => {
        showToast('複製失敗', 'error')
    })
}

/**
 * 轉義 HTML
 */
function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]))
}

// ================================
// 管理員功能
// ================================

/**
 * 開啟登入彈窗
 */
function openLoginModal() {
    document.getElementById('adminPassword').value = ''
    document.getElementById('loginError').classList.add('hidden')
    document.getElementById('loginModal').classList.add('active')
    // 自動聚焦密碼輸入框
    setTimeout(() => document.getElementById('adminPassword').focus(), 100)
}

/**
 * 關閉登入彈窗
 */
function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active')
    document.getElementById('adminPassword').value = ''
    document.getElementById('loginError').classList.add('hidden')
}

/**
 * 嘗試登入
 */
function attemptLogin() {
    const password = document.getElementById('adminPassword').value

    if (password === GOOGLE_CONFIG.ADMIN_PASSWORD) {
        // 密碼正確
        state.isAdmin = true
        closeLoginModal()
        renderAdminToolbar()
        renderGallery()
        updateLoginButton()
        showToast('已啟用管理員模式', 'success')
    } else {
        // 密碼錯誤
        document.getElementById('loginError').classList.remove('hidden')
        document.getElementById('adminPassword').value = ''
        document.getElementById('adminPassword').focus()
    }
}

/**
 * 登出管理員
 */
function logoutAdmin() {
    state.isAdmin = false
    renderAdminToolbar()
    renderGallery()
    updateLoginButton()
    showToast('已退出管理員模式', 'info')
}

/**
 * 更新登入按鈕狀態
 */
function updateLoginButton() {
    const signInBtn = document.getElementById('googleSignInBtn')
    const signOutBtn = document.getElementById('signOutBtn')

    if (state.isAdmin) {
        signInBtn.classList.add('hidden')
        signOutBtn.classList.remove('hidden')
    } else {
        signInBtn.classList.remove('hidden')
        signOutBtn.classList.add('hidden')
    }
}

/**
 * 渲染管理員工具列
 */
function renderAdminToolbar() {
    const toolbar = document.getElementById('adminToolbar')
    if (state.isAdmin) {
        toolbar.classList.remove('hidden')
    } else {
        toolbar.classList.add('hidden')
    }
}


// ================================
// Modal 操作
// ================================

let currentEditId = null
let uploadedImageBase64 = null

/**
 * 開啟新增 Modal
 */
function openAddModal() {
    currentEditId = null
    uploadedImageBase64 = null
    document.getElementById('editModalTitle').textContent = '新增項目'
    document.getElementById('editPrompt').value = ''
    document.getElementById('editImageUrl').value = ''
    resetPreview()
    renderCategoryCheckboxes([])
    document.getElementById('editModal').classList.add('active')
}

/**
 * 開啟編輯 Modal
 */
function openEditModal(id) {
    const item = state.items.find(i => i.id === id)
    if (!item) return

    currentEditId = id
    uploadedImageBase64 = null
    document.getElementById('editModalTitle').textContent = '編輯項目'
    document.getElementById('editPrompt').value = item.prompt || ''
    document.getElementById('editImageUrl').value = item.imageUrl || ''

    if (item.imageUrl) {
        showPreview(item.imageUrl)
    } else {
        resetPreview()
    }

    renderCategoryCheckboxes(item.categories || [])
    document.getElementById('editModal').classList.add('active')
}

/**
 * 關閉編輯 Modal
 */
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active')
    currentEditId = null
    uploadedImageBase64 = null
}

/**
 * 渲染分類勾選框
 */
function renderCategoryCheckboxes(selectedIds) {
    const container = document.getElementById('categoryCheckboxes')
    container.innerHTML = state.categories.map(cat => `
        <label class="checkbox-label">
            <input type="checkbox" value="${cat.id}" 
                   ${selectedIds.includes(cat.id) ? 'checked' : ''}>
            ${cat.name}
        </label>
    `).join('')
}

/**
 * 取得選中的分類
 */
function getSelectedCategories() {
    const checkboxes = document.querySelectorAll('#categoryCheckboxes input:checked')
    return Array.from(checkboxes).map(cb => cb.value)
}

/**
 * 儲存項目
 */
async function saveItem() {
    const prompt = document.getElementById('editPrompt').value.trim()
    let imageUrl = document.getElementById('editImageUrl').value.trim()
    const categories = getSelectedCategories()

    if (!prompt) {
        showToast('請輸入提示詞', 'warning')
        return
    }

    // 如果有上傳的圖片，先上傳到 GAS
    if (uploadedImageBase64) {
        try {
            showLoading('正在上傳圖片...')
            imageUrl = await uploadImageToGAS(uploadedImageBase64, `prompt-${Date.now()}.png`)
        } catch (error) {
            return
        }
    }

    const item = { prompt, imageUrl, categories }

    try {
        if (currentEditId) {
            item.id = currentEditId
            await updateItem(item)
        } else {
            await addItem(item)
        }
        closeEditModal()
    } catch (error) {
        // 錯誤已在函數內處理
    }
}

/**
 * 確認刪除
 */
function confirmDelete(id) {
    if (confirm('確定要刪除這個項目嗎？')) {
        deleteItem(id)
    }
}

// ================================
// 圖片上傳處理
// ================================

function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea')
    const fileInput = document.getElementById('imageFileInput')

    uploadArea.addEventListener('click', () => fileInput.click())

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault()
        uploadArea.classList.add('dragover')
    })

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover')
    })

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault()
        uploadArea.classList.remove('dragover')
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file)
        }
    })

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]
        if (file) {
            handleImageFile(file)
        }
    })
}

function handleImageFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
        uploadedImageBase64 = e.target.result
        showPreview(e.target.result)
    }
    reader.readAsDataURL(file)
}

function showPreview(src) {
    document.getElementById('previewImage').src = src
    document.getElementById('uploadPlaceholder').classList.add('hidden')
    document.getElementById('uploadPreview').classList.remove('hidden')
}

function resetPreview() {
    document.getElementById('uploadPlaceholder').classList.remove('hidden')
    document.getElementById('uploadPreview').classList.add('hidden')
    document.getElementById('previewImage').src = ''
    uploadedImageBase64 = null
}

function removePreview() {
    resetPreview()
    document.getElementById('editImageUrl').value = ''
}

// ================================
// 圖片放大 Modal
// ================================

function openImageModal(imageUrl, prompt) {
    document.getElementById('enlargedImage').src = imageUrl
    document.getElementById('enlargedPrompt').textContent = prompt
    document.getElementById('imageModal').classList.add('active')
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active')
}

// ================================
// 分類管理 Modal
// ================================

function openCategoryModal() {
    renderCategoryList()
    document.getElementById('categoryModal').classList.add('active')
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active')
}

function renderCategoryList() {
    const container = document.getElementById('categoryList')
    container.innerHTML = state.categories.map(cat => `
        <div class="category-item">
            <span>${cat.name}</span>
            <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')">刪除</button>
        </div>
    `).join('')
}

async function addCategory() {
    const input = document.getElementById('newCategoryName')
    const name = input.value.trim()
    if (!name) {
        showToast('請輸入分類名稱', 'warning')
        return
    }

    await addCategoryToSheet(name)
    input.value = ''
    renderCategoryList()
}

async function deleteCategory(id) {
    if (confirm('確定要刪除這個分類嗎？')) {
        await deleteCategoryFromSheet(id)
        renderCategoryList()
    }
}

// ================================
// 排序 Modal
// ================================

let sortableItems = []

function openSortModal() {
    sortableItems = [...state.items].sort((a, b) => (a.order || 0) - (b.order || 0))
    renderSortableList()
    document.getElementById('sortModal').classList.add('active')
}

function closeSortModal() {
    document.getElementById('sortModal').classList.remove('active')
}

function renderSortableList() {
    const container = document.getElementById('sortableList')
    container.innerHTML = sortableItems.map((item, index) => `
        <div class="sortable-item" data-id="${item.id}">
            <span class="sort-handle">☰</span>
            <img src="${item.imageUrl}" alt="" class="sort-thumb">
            <span class="sort-prompt">${escapeHtml(item.prompt?.substring(0, 50))}...</span>
            <div class="sort-buttons">
                <button class="btn btn-sm" onclick="moveItem(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn btn-sm" onclick="moveItem(${index}, 1)" ${index === sortableItems.length - 1 ? 'disabled' : ''}>↓</button>
            </div>
        </div>
    `).join('')
}

function moveItem(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sortableItems.length) return

    const temp = sortableItems[index]
    sortableItems[index] = sortableItems[newIndex]
    sortableItems[newIndex] = temp

    renderSortableList()
}

async function saveSortOrder() {
    await updateSortOrder(sortableItems)
    closeSortModal()
}

// ================================
// 搜尋功能
// ================================

function setupSearch() {
    const searchInput = document.getElementById('searchInput')
    const clearBtn = document.getElementById('clearSearch')

    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value
        clearBtn.classList.toggle('hidden', !state.searchQuery)
        renderGallery()
    })

    clearBtn.addEventListener('click', () => {
        searchInput.value = ''
        state.searchQuery = ''
        clearBtn.classList.add('hidden')
        renderGallery()
    })
}

// ================================
// 工具函數
// ================================

function showLoading(message = '正在載入...') {
    const overlay = document.getElementById('loadingOverlay')
    overlay.querySelector('p').textContent = message
    overlay.classList.add('active')
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active')
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast')
    if (existing) existing.remove()

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message
    document.body.appendChild(toast)

    setTimeout(() => toast.classList.add('show'), 10)
    setTimeout(() => {
        toast.classList.remove('show')
        setTimeout(() => toast.remove(), 300)
    }, 3000)
}

// ================================
// 事件監聽器設定
// ================================

function setupEventListeners() {
    // 登入按鈕 - 開啟密碼輸入彈窗
    document.getElementById('googleSignInBtn').addEventListener('click', openLoginModal)

    // 登出按鈕
    document.getElementById('signOutBtn').addEventListener('click', logoutAdmin)


    // Modal 背景點擊關閉
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active')
            }
        })
    })

    // ESC 關閉 Modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active')
            })
        }
    })
}

// ================================
// 初始化
// ================================

async function init() {
    setupEventListeners()
    setupSearch()
    setupUploadArea()
    renderCategoryTabs()
    renderGallery()

    // 載入資料
    await loadData()
}

// 當 DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', init)

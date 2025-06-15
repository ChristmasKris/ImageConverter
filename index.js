'use strict';

const index = {
	inputImage: document.querySelector('.imageInput'),
	format: document.querySelector('.format'),
	convertButton: document.querySelector('.convertButton'),
	imgPreview: document.querySelector('.imgPreview'),
	dragOverlay: document.querySelector('.dragOverlay'),
	nameInput: document.querySelector('.nameInput'),
	queue: document.querySelector('.queue'),
	imageInputButton: document.querySelector('.imageInputButton'),
	dragCounter: 0,
	imageQueue: [],
	slideshowInterval: null,
	slideshowIndex: 0,
	slideshowResumeTimeout: null,
	isMouseOverQueueItem: false,

	init() {
		listener.add(index.imageInputButton, 'click', () => {
			index.inputImage.click();
		});
		
		listener.add(index.inputImage, 'change', () => {
			const files = Array.from(index.inputImage.files).filter(file => index.isValidImageType(file.type));
			
			if (files.length > 0) {
				index.imageInputButton.textContent = 'Upload more image(s)';
				index.imageQueue = index.imageQueue.concat(files);
				index.updateQueue();
				index.startSlideshow();
				const reader = new FileReader();
				
				listener.add(reader, 'load', (e) => {
					index.imgPreview.src = e.target.result;
					index.imgPreview.style.display = 'block';
				});
				
				reader.readAsDataURL(files[0]);
			}
		});
		
		listener.add(index.convertButton, 'click', () => {
			if (index.imageQueue.length === 0) {
				alert('Please upload/drag & drop one or more images of type (PNG, JPG/JPEG, WEBP).');
				return;
			}
			
			if (index.nameInput.value.trim().length > 250) {
				alert('There is a 250-character limit on filenames. Please shorten the name.');
				return;
			}
			
			index.convertAllImages();
		});
		
		listener.add(document.body, 'dragenter', (e) => {
			index.dragCounter++;
			const items = e.dataTransfer && e.dataTransfer.items;
			
			if (items && items.length > 0) {
				const item = items[0];
				
				if ((item.kind === 'file') && index.isValidImageType(item.type)) {
					index.dragOverlay.style.display = 'flex';
				}
			}
		});

		listener.add(document.body, 'dragleave', (e) => {
			index.dragCounter--;
			
			if (index.dragCounter <= 0) {
				index.dragOverlay.style.display = 'none';
				index.dragCounter = 0;
			}
		});
		
		listener.add(document.body, 'dragover', (e) => {
			e.preventDefault();
		});
		
		listener.add(document, 'keydown', (e) => {
			if (e.key === 'Escape') {
				index.dragOverlay.style.display = 'none';
				index.dragCounter = 0;
			}
		});
		
		listener.add(document.body, 'drop', (e) => {
			e.preventDefault();
			index.dragOverlay.style.display = 'none';
			const files = e.dataTransfer.files;

			if (files && files.length > 0) {
				const validFiles = Array.from(files).filter(file => index.isValidImageType(file.type));
				
				if (validFiles.length > 0) {
					index.imageInputButton.textContent = 'Upload more image(s)';
					index.imageQueue = index.imageQueue.concat(validFiles);
					index.updateQueue();
					index.startSlideshow();
					const reader = new FileReader();
					
					listener.add(reader, 'load', (e) => {
						index.imgPreview.src = e.target.result;
						index.imgPreview.style.display = 'block';
					});
					
					reader.readAsDataURL(validFiles[0]);
				} else {
					alert('Please drop valid PNG, JPG/JPEG or WEBP image files only.');
				}
			}
		});
	},
	
	isValidImageType(type) {
		return ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(type);
	},
	
	updateQueue() {
		index.queue.innerHTML = '';

		if (index.imageQueue.length > 0) {
			index.queue.style.display = 'flex';
		} else {
			index.queue.style.display = 'none';
		}
		
		index.imageQueue.forEach((file, i) => {
			let filename = file.name;
			const maxChars = 35;
			
			if (filename.length > maxChars) {
				const keep = Math.floor((maxChars - 3) / 2);
				filename = filename.slice(0, keep) + '...' + filename.slice(-keep);
			}
			
			let el = strToEl(`
				<div class="queueItem">
					<div class="thumbnail"></div>
					<div class="name" title="${file.name}">
						<span>${i + 1}. ${filename}</span>
					</div>
					<button title="Remove from queue">
						<i class="fa-regular fa-trash-can"></i>
					</button>
				</div>
			`);
			
			const reader = new FileReader();
			
			listener.add(reader, 'load', (e) => {
				el.querySelector('.thumbnail').style.backgroundImage = `url('${e.target.result}')`;
			});
			
			reader.readAsDataURL(file);
			
			listener.add(el.querySelector('button'), 'click', (e) => {
				e.stopPropagation();
				index.imageQueue.splice(i, 1);
				index.updateQueue();
				index.startSlideshow();
				
				if (index.imageQueue.length > 0) {
					index.showPreview(0);
				} else {
					index.imgPreview.src = '';
					index.imgPreview.style.display = 'none';
					index.imageInputButton.textContent = 'Upload image(s)';
				}
			});
			
			listener.add(el, 'mouseenter', () => {
				index.isMouseOverQueueItem = true;
				index.showPreview(i);
				
				if (index.slideshowInterval) {
					clearInterval(index.slideshowInterval);
					index.slideshowInterval = null;
				}
				
				if (index.slideshowResumeTimeout) {
					clearTimeout(index.slideshowResumeTimeout);
					index.slideshowResumeTimeout = null;
				}
			});
			
			listener.add(el, 'mouseleave', () => {
				index.isMouseOverQueueItem = false;
				
				if (index.slideshowResumeTimeout) {
					clearTimeout(index.slideshowResumeTimeout);
				}
				
				index.slideshowResumeTimeout = setTimeout(() => {
					if (!index.isMouseOverQueueItem) {
						index.startSlideshow();
					}
				}, 2000);
			});
			
			index.queue.appendChild(el);
		});
	},
	
	startSlideshow() {
		if (index.slideshowInterval) {
			clearInterval(index.slideshowInterval);
			index.slideshowInterval = null;
		}
		
		if (index.imageQueue.length === 0) {
			index.imgPreview.src = '';
			index.imgPreview.style.display = 'none';
			return;
		}
		
		if (index.imageQueue.length === 1) {
			index.showPreview(0);
			return;
		}
		
		index.slideshowIndex = 0;
		index.showPreview(index.slideshowIndex, true);
		index.slideshowInterval = setInterval(() => {
			if (index.imageQueue.length <= 1) {
				clearInterval(index.slideshowInterval);
				index.slideshowInterval = null;
				return;
			}
			
			index.slideshowIndex = (index.slideshowIndex + 1) % index.imageQueue.length;
			index.showPreview(index.slideshowIndex, true);
		}, 2000);
	},

	showPreview(idx, smooth) {
		const file = index.imageQueue[idx];
		const reader = new FileReader();
		
		listener.add(reader, 'load', (e) => {
			if (smooth) {
				index.imgPreview.style.transition = 'opacity 0.5s';
				index.imgPreview.style.opacity = 0;
				
				setTimeout(() => {
					index.imgPreview.src = e.target.result;
					index.imgPreview.style.display = 'block';
					index.imgPreview.style.opacity = 1;
				}, 500);
			} else {
				index.imgPreview.style.transition = '';
				index.imgPreview.src = e.target.result;
				index.imgPreview.style.display = 'block';
				index.imgPreview.style.opacity = 1;
			}
		});
		
		reader.readAsDataURL(file);
	},
	
	convertAllImages() {
		const format = index.format.value;
		const nameBase = index.nameInput.value.trim() || 'ConvertedImage';
		
		index.imageQueue.forEach((file, idx) => {
			const img = new Image();
			
			listener.add(img, 'load', () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				let mime = 'image/' + format;
				let extension = format;
				if (format === 'jpeg') mime = 'image/jpeg';
				
				canvas.toBlob(blob => {
					if (!blob) {
						return;
					}
					
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `${nameBase}_${idx + 1}.${extension}`;
					document.body.appendChild(a);
					a.click();
					
					setTimeout(() => {
						document.body.removeChild(a);
						URL.revokeObjectURL(url);
					}, 100);
				}, mime, 1.0);
			});
			
			listener.add(img, 'error', () => {
				alert(`Error: The image with ID ${idx + 1} is invalid.`);
			});
			
			img.src = URL.createObjectURL(file);
		});
	}
};

index.init();
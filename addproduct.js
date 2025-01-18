<script>

        function validateForm() {
            clearErrorMessages();

            // Getting form values
            const name = document.getElementsByName('productName')[0].value.trim();
            const description = document.getElementById('descriptionid').value.trim();
            const price = document.getElementsByName('regularPrice')[0].value.trim();
            const saleprice = document.getElementsByName('salePrice')[0].value.trim();
            const color = document.getElementsByName('color')[0].value.trim();
            const category = document.getElementsByName('category')[0].value.trim();
            const images = document.getElementById('input1');
            const quantity = document.getElementsByName('quantity')[0].value.trim();

            let isValid = true;


            const previewContainer = document.getElementById("imagePreview");
            const uploadedImages = previewContainer.children.length;

            if (uploadedImages !== 4) {
                alert("Please upload exactly 4 images.");
                return false;
            }

            return true;

            // Product Name Validation
            if (name === "") {
                displayErrorMessage('productName-error', 'Please enter a product name.');
                isValid = false;
            } else if (!/^[a-zA-Z\s]+$/.test(name)) {
                displayErrorMessage('productName-error', 'Product name should contain only alphabetic characters.');
                isValid = false;
            }

            // Description Validation
            if (description === "") {
                displayErrorMessage('description-error', 'Please enter a product description.');
                isValid = false;
            }

            // Quantity Validation
            if (!/^\d+$/.test(quantity) || parseInt(quantity) < 0) {
                displayErrorMessage('quantity-error', 'Please enter a valid non-negative quantity.');
                isValid = false;
            }

            // Price Validation
            if (!/^\d+(\.\d{1,2})?$/.test(price) || parseFloat(price) <= 0) {
                displayErrorMessage('regularPrice-error', 'Please enter a valid non-negative price.');
                isValid = false;
            }

            // Sale Price Validation
            if (!/^\d+(\.\d{1,2})?$/.test(saleprice) || parseFloat(saleprice) < 0) {
                displayErrorMessage('salePrice-error', 'Please enter a valid non-negative sale price.');
                isValid = false;
            }
            if (parseFloat(saleprice) >= parseFloat(price)) {
                displayErrorMessage('regularPrice-error', 'Regular price must be greater than sale price.');
                isValid = false;
            }

            // Color Validation
            if (color === "") {
                displayErrorMessage('color-error', 'Please enter a color.');
                isValid = false;
            }

            // Images Validation
            if (images.files.length === 0) {
                displayErrorMessage('images-error', 'Please select at least one image.');
                isValid = false;
            }

            // Category Validation
            if (category === "") {
                displayErrorMessage('category-error', 'Please select a category.');
                isValid = false;
            }

            return isValid;
        }

        function displayErrorMessage(elementId, message) {
            const errorElement = document.getElementById(elementId);
            errorElement.innerText = message;
            errorElement.style.display = "block";
        }

        function clearErrorMessages() {
            const errorElements = document.getElementsByClassName('error-message');
            Array.from(errorElements).forEach(element => {
                element.innerText = '';
                element.style.display = 'none';
            });
        }

    </script>

    <script>
        let cropper; // Global cropper instance
        let currentInput; // Tracks the current input element being processed

        document.querySelectorAll(".image-input").forEach(input => {
            input.addEventListener("change", function (e) {
                const file = e.target.files[0];
                const previewContainer = document.getElementById("imagePreview");
                const uploadedImages = previewContainer.children.length;

                if (uploadedImages >= 4) {
                    alert("You can upload a maximum of 4 images.");
                    e.target.value = ""; // Clear the file input
                    return;
                }

                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const imageToCrop = document.getElementById("imageToCrop");
                        imageToCrop.src = e.target.result;

                        // Open modal and initialize cropper
                        const modal = new bootstrap.Modal(document.getElementById("cropperModal"));
                        modal.show();

                        // Destroy previous cropper instance if it exists
                        if (cropper) {
                            cropper.destroy();
                        }

                        // Initialize cropper
                        cropper = new Cropper(imageToCrop, {
                            aspectRatio: 1, // Ensures a square crop
                            viewMode: 2
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        });


        
        // Modify the crop button event listener
        document.getElementById("cropButton").addEventListener("click", function () {
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 800,
                height: 800
            });

            // Convert canvas to base64
            const croppedImage = croppedCanvas.toDataURL('image/jpeg');

            // Add the cropped image to a hidden input in the form
            const imageInput = document.createElement('input');
            imageInput.type = 'hidden';
            imageInput.name = 'croppedImages[]';
            imageInput.value = croppedImage;
            document.getElementById('productForm').appendChild(imageInput);

            // Preview the cropped image
            const previewContainer = document.getElementById("imagePreview");
            const previewItem = document.createElement("div");
            previewItem.classList.add("preview-item");

            const imgPreview = document.createElement("img");
            imgPreview.src = croppedImage;
            previewItem.appendChild(imgPreview);

            const deleteButton = document.createElement("button");
            deleteButton.innerText = "Delete";
            deleteButton.classList.add("btn", "btn-danger", "btn-sm", "mt-2");
            deleteButton.onclick = function () {
                previewItem.remove();
                imageInput.remove(); // Remove the hidden input when image is deleted
            };
            previewItem.appendChild(deleteButton);

            previewContainer.appendChild(previewItem);

            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById("cropperModal"));
            modal.hide();
        });


    </script>
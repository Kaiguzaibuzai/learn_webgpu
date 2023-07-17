const initWebGPU = async () => {
	console.log(navigator);

	if (!navigator) {
		throw new Error('Your browser not support webgpu!');
	}

	// get adapter
	const adapter = await navigator.gpu.requestAdapter({
		powerPreference: 'high-performance'
	});

	if (!adapter) {
		throw new Error('No adapter');
	}

	// get device
	const device = await adapter.requestDevice();

	return { device }
}

const initRenderTarget  = (device) => {
	let width = window.innerWidth || 2;
	let height = window.innerHeight || 2;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	document.body.appendChild(canvas);

	const context = canvas.getContext('webgpu');

	// Return the preferred GPUTextureFormat for displaying 8-bit depth, standard dynamic range content on this system.
	const format = navigator.gpu.getPreferredCanvasFormat ? navigator.gpu.getPreferredCanvasFormat() : context.getPreferredFormat(adapter);

	// Configure the context of this canvas.
	// This will clear the drawing buffer, making it transparent black.
	context.configure({
		device,
		// format,
		format: format,  // 'bgra8unorm'
		usage: GPUTextureUsage.RENDER_ATTACHMENT, // ！！
		alphaModeL: 'opaque'
	});

	const colorBuffer = device.createTexture({
		size: {
			width: canvas.width,
			height: canvas.height,
			depthOrArrayLayers: 1
		},
		sampleCount: 4, 	// for antialias
		format: format, // 'bgra8unorm'
		usage: GPUTextureUsage.RENDER_ATTACHMENT
	});

	const depthBuffer = device.createTexture({
		size: {
			width: canvas.width,
			height: canvas.height,
			depthOrArrayLayers: 1
		},
		sampleCount: 4,	// for antialias
		format: 'depth24plus-stencil8',
		usage: GPUTextureUsage.RENDER_ATTACHMENT
	});

	const resolveTarget = context.getCurrentTexture().createView();

	const colorView = colorBuffer.createView();

	const depthView = depthBuffer.createView();

	const colorAttachments = [{
		view: colorView,
		resolveTarget: resolveTarget,
		clearValue: { r: 0, g: 0, b: 0, a: 0 },
		loadOp: 'clear',
		storeOp: 'store'
	}];

	const depthStencilAttachment = {
		view: depthView,
		depthClearValue: 1,
		depthLoadOp: 'clear',
		stencilClearValue: 0,
		stencilLoadOp: 'clear',
		depthStoreOp: 'store',
		stencilStoreOp: 'store'
	}

	const renderPassDescriptor = {
		colorAttachments,
		depthStencilAttachment
	}

	return { renderPassDescriptor }
}

const draw = (device, renderPassDescriptor) => {
	// different begin end

	// begin encoder

	const commandEncoder = device.createCommandEncoder();
	const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

	// pipeLine

	// end encoder
	passEncoder.end();

	device.queue.submit([commandEncoder.finish()]);
}

const run = async () => {
	const { device } = await initWebGPU();

	const { renderPassDescriptor } = initRenderTarget(device);

	draw(device, renderPassDescriptor);
}

export { run }
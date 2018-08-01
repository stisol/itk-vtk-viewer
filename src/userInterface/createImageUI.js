import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkPiecewiseGaussianWidget from 'vtk.js/Sources/Interaction/Widgets/PiecewiseGaussianWidget';
import vtkMouseRangeManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseRangeManipulator';

import sampleDistanceIcon from 'vtk.js/Sources/Interaction/UI/Icons/Spacing.svg';

import getContrastSensitiveStyle from './getContrastSensitiveStyle';

import style from './ItkVtkImageViewer.mcss';

import shadowIcon from './icons/shadow.svg';
import gradientOpacityIcon from './icons/gradient.svg';
import viewPlansIcon from './icons/view-planes.svg';

function createViewPlanesToggle(
  imageUIGroup,
  viewerDOMId,
  volumeRenderingRow,
  view,
) {
  let viewPlanes = false;
  function setViewPlanes() {
    viewPlanes = !viewPlanes;
    view.setViewPlanes(viewPlanes);
    const xPlaneRow = imageUIGroup.querySelector(`.${viewerDOMId}-x-plane-row`);
    const yPlaneRow = imageUIGroup.querySelector(`.${viewerDOMId}-y-plane-row`);
    const zPlaneRow = imageUIGroup.querySelector(`.${viewerDOMId}-z-plane-row`);
    if (view.getViewMode() === 'VolumeRendering') {
      if (viewPlanes) {
        xPlaneRow.style.display = 'flex';
        yPlaneRow.style.display = 'flex';
        zPlaneRow.style.display = 'flex';
      } else {
        xPlaneRow.style.display = 'none';
        yPlaneRow.style.display = 'none';
        zPlaneRow.style.display = 'none';
      }
    }
  }

  const viewPlanesButton = document.createElement('div');
  viewPlanesButton.innerHTML = `<input id="${viewerDOMId}-toggleSlicingPlanesButton" type="checkbox" class="${
    style.toggleInput
  }"><label class="${style.viewPlanesButton} ${
    style.toggleButton
  }" for="${viewerDOMId}-toggleSlicingPlanesButton">${viewPlansIcon}</label>`;
  viewPlanesButton.addEventListener('change', (event) => {
    setViewPlanes();
  });
  volumeRenderingRow.appendChild(viewPlanesButton);
}

function createUseShadowToggle(
  uiContainer,
  viewerDOMId,
  volumeRepresentation,
  renderWindow,
  isBackgroundDark
) {
  const contrastSensitiveStyle = getContrastSensitiveStyle(
    ['shadowButton'],
    isBackgroundDark
  );

  const useShadowButton = document.createElement('div');
  useShadowButton.innerHTML = `<input id="${viewerDOMId}-toggleShadowButton" type="checkbox" class="${
    style.toggleInput
  }" checked><label class="${contrastSensitiveStyle.shadowButton} ${
    style.toggleButton
  }" for="${viewerDOMId}-toggleShadowButton">${shadowIcon}</label>`;
  let useShadow = true;
  useShadowButton.addEventListener('change', (event) => {
    useShadow = !useShadow;
    volumeRepresentation.setUseShadow(useShadow);
    renderWindow.render();
  });
  uiContainer.appendChild(useShadowButton);
}

function createTransferFunctionWidget(
  uiContainer,
  viewerDOMId,
  lookupTableProxy,
  piecewiseFunctionProxy,
  dataArray,
  view,
  renderWindow,
  use2D
) {
  const piecewiseFunction = piecewiseFunctionProxy.getPiecewiseFunction();

  const transferFunctionWidget = vtkPiecewiseGaussianWidget.newInstance({
    numberOfBins: 256,
    size: [400, 150],
  });
  let iconSize = 20;
  if (use2D) {
    iconSize = 0;
  }
  transferFunctionWidget.updateStyle({
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    histogramColor: 'rgba(30, 30, 30, 0.6)',
    strokeColor: 'rgb(0, 0, 0)',
    activeColor: 'rgb(255, 255, 255)',
    handleColor: 'rgb(50, 50, 150)',
    buttonDisableFillColor: 'rgba(255, 255, 255, 0.5)',
    buttonDisableStrokeColor: 'rgba(0, 0, 0, 0.5)',
    buttonStrokeColor: 'rgba(0, 0, 0, 1)',
    buttonFillColor: 'rgba(255, 255, 255, 1)',
    strokeWidth: 2,
    activeStrokeWidth: 3,
    buttonStrokeWidth: 1.5,
    handleWidth: 4,
    iconSize, // Can be 0 if you want to remove buttons (dblClick for (+) / rightClick for (-))
    padding: 10,
  });
  transferFunctionWidget.setDataArray(dataArray.getData());

  const lookupTable = lookupTableProxy.getLookupTable();

  const piecewiseWidgetContainer = document.createElement('div');
  piecewiseWidgetContainer.setAttribute('class', style.piecewiseWidget);

  transferFunctionWidget.setContainer(piecewiseWidgetContainer);
  transferFunctionWidget.bindMouseListeners();

  // Manage update when opacity changes
  transferFunctionWidget.onAnimation((start) => {
    if (start) {
      renderWindow.getInteractor().requestAnimation(transferFunctionWidget);
    } else {
      renderWindow.getInteractor().cancelAnimation(transferFunctionWidget);
      renderWindow.render();
    }
  });
  transferFunctionWidget.onOpacityChange(() => {
    if (!use2D) {
      transferFunctionWidget.applyOpacity(piecewiseFunction);
    }
    const colorDataRange = transferFunctionWidget.getOpacityRange();
    const preset = vtkColorMaps.getPresetByName(
      lookupTableProxy.getPresetName()
    );
    lookupTable.applyColorMap(preset);
    lookupTable.setMappingRange(...colorDataRange);
    lookupTable.updateRange();

    if (!renderWindow.getInteractor().isAnimating()) {
      renderWindow.render();
    }
  });

  // Manage update when lookupTable changes
  lookupTable.onModified(() => {
    transferFunctionWidget.render();
    if (!renderWindow.getInteractor().isAnimating()) {
      renderWindow.render();
    }
  });

  transferFunctionWidget.setColorTransferFunction(lookupTable);
  if (use2D) {
    // Necessary side effect: addGaussian calls invokeOpacityChange, which
    // calls onOpacityChange, which updates the lut (does not have a low
    // opacity in 2D)
    transferFunctionWidget.addGaussian(0.5, 1.0, 0.5, 0.0, 3.0);
  } else {
    transferFunctionWidget.addGaussian(0.5, 1.0, 0.5, 0.5, 0.4);
  }
  transferFunctionWidget.applyOpacity(piecewiseFunction);
  transferFunctionWidget.render();

  const transferFunctionWidgetRow = document.createElement('div');
  transferFunctionWidgetRow.setAttribute('class', style.uiRow);
  transferFunctionWidgetRow.className += ` ${viewerDOMId}-toggle`;
  transferFunctionWidgetRow.appendChild(piecewiseWidgetContainer);
  uiContainer.appendChild(transferFunctionWidgetRow);

  // Create range manipulator
  const rangeManipulator = vtkMouseRangeManipulator.newInstance({
    button: 1,
    alt: true,
  });

  // Window
  const windowMotionScale = 150.0;
  const windowGet = () => {
    const gaussian = transferFunctionWidget.getGaussians()[0];
    return gaussian.width * windowMotionScale;
  }
  const windowSet = (value) => {
    const gaussians = transferFunctionWidget.getGaussians();
    const newGaussians = gaussians.slice();
    newGaussians[0].width = value / windowMotionScale;
    transferFunctionWidget.setGaussians(newGaussians);
  }
  rangeManipulator.setVerticalListener(0, windowMotionScale, 1, windowGet, windowSet);

  // Level
  const levelMotionScale = 150.0;
  const levelGet = () => {
    const gaussian = transferFunctionWidget.getGaussians()[0];
    return gaussian.position * levelMotionScale;
  }
  const levelSet = (value) => {
    const gaussians = transferFunctionWidget.getGaussians();
    const newGaussians = gaussians.slice();
    newGaussians[0].position = value / levelMotionScale;
    transferFunctionWidget.setGaussians(newGaussians);
  }
  rangeManipulator.setHorizontalListener(0, levelMotionScale, 1, levelGet, levelSet);

  // Add range manipulator
  view.getInteractorStyle2D().addMouseManipulator(rangeManipulator);
  view.getInteractorStyle3D().addMouseManipulator(rangeManipulator);

  const opacityRangeManipulator = vtkMouseRangeManipulator.newInstance({
    button: 3, // Right mouse
    alt: true,
  });
  const opacityRangeManipulatorShift = vtkMouseRangeManipulator.newInstance({
    button: 1, // Left mouse
    shift: true, // For the macOS folks
    alt: true,
  });

  // Opacity
  const opacityMotionScale = 200.0;
  const opacityGet = () => {
    const gaussian = transferFunctionWidget.getGaussians()[0];
    return gaussian.height * opacityMotionScale;
  }
  const opacitySet = (value) => {
    const gaussians = transferFunctionWidget.getGaussians();
    const newGaussians = gaussians.slice();
    newGaussians[0].height = value / opacityMotionScale;
    transferFunctionWidget.setGaussians(newGaussians);
  }
  opacityRangeManipulator.setVerticalListener(0, opacityMotionScale, 1, opacityGet, opacitySet);
  opacityRangeManipulatorShift.setVerticalListener(0, opacityMotionScale, 1, opacityGet, opacitySet);
  view.getInteractorStyle3D().addMouseManipulator(opacityRangeManipulator);
  view.getInteractorStyle3D().addMouseManipulator(opacityRangeManipulatorShift);

  return transferFunctionWidget;
}

function createPlaneIndexSliders(
  uiContainer,
  viewerDOMId,
  volumeRepresentation,
  renderWindow,
  isBackgroundDark
) {
  const contrastSensitiveStyle = getContrastSensitiveStyle(
    ['sliderLabel'],
    isBackgroundDark
  );
  const numberOfValueChars = 6;
  let currentSlicePosition = null;

  const xPlaneRow = document.createElement('div');
  xPlaneRow.setAttribute('class', style.uiRow);
  xPlaneRow.className += ` ${viewerDOMId}-toggle ${viewerDOMId}-x-plane-row`;

  const xSlice = volumeRepresentation.getPropertyDomainByName('xSlice')
  const ySlice = volumeRepresentation.getPropertyDomainByName('ySlice')
  const zSlice = volumeRepresentation.getPropertyDomainByName('zSlice')

  const xSliderEntry = document.createElement('div');
  xSliderEntry.setAttribute('class', style.sliderEntry);
  currentSlicePosition = volumeRepresentation.getXSlice();
  xSliderEntry.innerHTML = `
    <label class="${
      contrastSensitiveStyle.sliderLabel
    } ${viewerDOMId}-x-slice-label">X:</label><input type="range" min="${xSlice.min}" max="${
    xSlice.max
  }" value="${currentSlicePosition}" step="${xSlice.step}"
      class="${style.slider} ${viewerDOMId}-x-slice" />`;
  const xSliceElement = xSliderEntry.querySelector(`.${viewerDOMId}-x-slice`);
  const xPlaneLabel = xSliderEntry.querySelector(`.${viewerDOMId}-x-slice-label`);
  function updateXSlice() {
    const value = Number(xSliceElement.value);
    volumeRepresentation.setXSlice(value);
    const valueString = String(xSliceElement.value).substring(0, numberOfValueChars);
    const padLength = valueString.length < numberOfValueChars ? numberOfValueChars - valueString.length : 0;
    const pad = '&nbsp;'.repeat(padLength);
    xPlaneLabel.innerHTML = `X: ${pad}${valueString}`;
    renderWindow.render();
  }
  xSliceElement.addEventListener('input', updateXSlice);
  xPlaneRow.appendChild(xSliderEntry);
  updateXSlice();
  xPlaneRow.style.display = 'none';

  uiContainer.appendChild(xPlaneRow);

  const yPlaneRow = document.createElement('div');
  yPlaneRow.setAttribute('class', style.uiRow);
  yPlaneRow.className += ` ${viewerDOMId}-toggle ${viewerDOMId}-y-plane-row`;

  const ySliderEntry = document.createElement('div');
  ySliderEntry.setAttribute('class', style.sliderEntry);
  currentSlicePosition = volumeRepresentation.getYSlice();
  ySliderEntry.innerHTML = `
    <label class="${
      contrastSensitiveStyle.sliderLabel
    } ${viewerDOMId}-y-slice-label">Y:</label><input type="range" min="${ySlice.min}" max="${
    ySlice.max
  }" value="${currentSlicePosition}" step="${ySlice.step}"
      class="${style.slider} ${viewerDOMId}-y-slice" />`;
  const ySliceElement = ySliderEntry.querySelector(`.${viewerDOMId}-y-slice`);
  const yPlaneLabel = ySliderEntry.querySelector(`.${viewerDOMId}-y-slice-label`);
  function updateYSlice() {
    const value = Number(ySliceElement.value);
    volumeRepresentation.setYSlice(value);
    const valueString = String(ySliceElement.value).substring(0, numberOfValueChars);
    const padLength = valueString.length < numberOfValueChars ? numberOfValueChars - valueString.length : 0;
    const pad = '&nbsp;'.repeat(padLength);
    yPlaneLabel.innerHTML = `Y: ${pad}${valueString}`;
    renderWindow.render();
  }
  ySliceElement.addEventListener('input', updateYSlice);
  yPlaneRow.appendChild(ySliderEntry);
  updateYSlice();
  yPlaneRow.style.display = 'none';

  uiContainer.appendChild(yPlaneRow);

  const zPlaneRow = document.createElement('div');
  zPlaneRow.setAttribute('class', style.uiRow);
  zPlaneRow.className += ` ${viewerDOMId}-toggle ${viewerDOMId}-z-plane-row`;

  const zSliderEntry = document.createElement('div');
  zSliderEntry.setAttribute('class', style.sliderEntry);
  currentSlicePosition = volumeRepresentation.getZSlice();
  zSliderEntry.innerHTML = `
    <label class="${
      contrastSensitiveStyle.sliderLabel
    } ${viewerDOMId}-z-slice-label">Z:</label><input type="range" min="${zSlice.min}" max="${
    zSlice.max
  }" value="${currentSlicePosition}" step="${zSlice.step}"
      class="${style.slider} ${viewerDOMId}-z-slice" />`;
  const zSliceElement = zSliderEntry.querySelector(`.${viewerDOMId}-z-slice`);
  const zPlaneLabel = zSliderEntry.querySelector(`.${viewerDOMId}-z-slice-label`);
  function updateZSlice() {
    const value = Number(zSliceElement.value);
    volumeRepresentation.setZSlice(value);
    const valueString = String(zSliceElement.value).substring(0, numberOfValueChars);
    const padLength = valueString.length < numberOfValueChars ? numberOfValueChars - valueString.length : 0;
    const pad = '&nbsp;'.repeat(padLength);
    zPlaneLabel.innerHTML = `Z: ${pad}${valueString}`;
    renderWindow.render();
  }
  zSliceElement.addEventListener('input', updateZSlice);
  zPlaneRow.appendChild(zSliderEntry);
  updateZSlice();
  zPlaneRow.style.display = 'none';

  uiContainer.appendChild(zPlaneRow);
}

function createColorPresetSelector(
  uiContainer,
  viewerDOMId,
  lookupTableProxy,
  renderWindow
) {
  const presetNames = vtkColorMaps.rgbPresetNames;

  const presetSelector = document.createElement('select');
  presetSelector.setAttribute('class', style.selector);
  presetSelector.className += ` ${viewerDOMId}-color-preset`;
  presetSelector.innerHTML = presetNames
    .map((name) => `<option value="${name}">${name}</option>`)
    .join('');

  function applyPreset(event) {
    lookupTableProxy.setPresetName(event.target.value);
    renderWindow.render();
  }

  presetSelector.addEventListener('change', applyPreset);
  uiContainer.appendChild(presetSelector);
  presetSelector.value = lookupTableProxy.getPresetName();
}

function createSampleDistanceSlider(
  uiContainer,
  viewerDOMId,
  isBackgroundDark,
  volumeRepresentation,
  renderWindow
) {
  const contrastSensitiveStyle = getContrastSensitiveStyle(
    ['sampleDistanceButton'],
    isBackgroundDark
  );

  const sliderEntry = document.createElement('div');
  sliderEntry.setAttribute('class', style.sliderEntry);
  sliderEntry.innerHTML = `
    <div class="${contrastSensitiveStyle.sampleDistanceButton}">
      ${sampleDistanceIcon}
    </div>
    <input type="range" min="0" max="1" value="0.3" step="0.01"
      class="${style.slider} ${viewerDOMId}-spacing" />`;
  const spacingElement = sliderEntry.querySelector(`.${viewerDOMId}-spacing`);
  function updateSpacing() {
    const value = Number(spacingElement.value);
    volumeRepresentation.setSampleDistance(value);
    renderWindow.render();
  }
  spacingElement.addEventListener('input', updateSpacing);
  updateSpacing();
  uiContainer.appendChild(sliderEntry);
}

function createGradientOpacitySlider(
  uiContainer,
  viewerDOMId,
  isBackgroundDark,
  volumeRepresentation,
  renderWindow
) {
  const contrastSensitiveStyle = getContrastSensitiveStyle(
    ['gradientOpacitySlider'],
    isBackgroundDark
  );

  const sliderEntry = document.createElement('div');
  sliderEntry.setAttribute('class', style.sliderEntry);
  sliderEntry.innerHTML = `
    <div class="${contrastSensitiveStyle.gradientOpacitySlider}">
      ${gradientOpacityIcon}
    </div>
    <input type="range" min="0" max="1" value="0.2" step="0.01"
      id="${viewerDOMId}-gradientOpacitySlider"
      class="${style.slider}" />`;
  const edgeElement = sliderEntry.querySelector(`#${viewerDOMId}-gradientOpacitySlider`)
  function updateGradientOpacity() {
    const value = Number(edgeElement.value);
    volumeRepresentation.setEdgeGradient(value);
    renderWindow.render();
  }
  edgeElement.addEventListener('input', updateGradientOpacity);
  updateGradientOpacity();
  uiContainer.appendChild(sliderEntry);

  return updateGradientOpacity;
}

function createImageUI(
  uiContainer,
  viewerDOMId,
  lookupTableProxy,
  piecewiseFunctionProxy,
  volumeRepresentation,
  dataArray,
  view,
  isBackgroundDark,
  use2D
) {
  const renderWindow = view.getRenderWindow();

  const imageUIGroup = document.createElement('div');
  imageUIGroup.setAttribute('class', style.uiGroup);

  if (dataArray.getNumberOfComponents() === 1) {
    const presetRow = document.createElement('div');
    presetRow.setAttribute('class', style.uiRow);
    createColorPresetSelector(presetRow, viewerDOMId, lookupTableProxy, renderWindow);
    presetRow.className += ` ${viewerDOMId}-toggle`
    imageUIGroup.appendChild(presetRow);
  }

  const transferFunctionWidget = createTransferFunctionWidget(
    imageUIGroup,
    viewerDOMId,
    lookupTableProxy,
    piecewiseFunctionProxy,
    dataArray,
    view,
    renderWindow,
    use2D
  );

  let updateGradientOpacity = null
  if (!use2D) {
    const volumeRenderingRow = document.createElement('div');
    volumeRenderingRow.setAttribute('class', style.uiRow);
    volumeRenderingRow.className += ` ${viewerDOMId}-volumeRendering ${viewerDOMId}-toggle`
    createViewPlanesToggle(
      imageUIGroup,
      viewerDOMId,
      volumeRenderingRow,
      view,
    );
    createUseShadowToggle(
      volumeRenderingRow,
      viewerDOMId,
      volumeRepresentation,
      renderWindow,
      isBackgroundDark
    );
    createSampleDistanceSlider(
      volumeRenderingRow,
      viewerDOMId,
      isBackgroundDark,
      volumeRepresentation,
      renderWindow
    );
    updateGradientOpacity = createGradientOpacitySlider(
      volumeRenderingRow,
      viewerDOMId,
      isBackgroundDark,
      volumeRepresentation,
      renderWindow
    );
    imageUIGroup.appendChild(volumeRenderingRow);

    createPlaneIndexSliders(
      imageUIGroup,
      viewerDOMId,
      volumeRepresentation,
      renderWindow,
      isBackgroundDark
    );
  }

  uiContainer.appendChild(imageUIGroup);

  return { transferFunctionWidget, updateGradientOpacity };
}

export default createImageUI;

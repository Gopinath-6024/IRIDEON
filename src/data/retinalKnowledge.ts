export interface RetinalAnatomyFeature {
  id: string;
  name: string;
  category: 'Landmark' | 'Vascular' | 'Lesion';
  coordinates: { x: number; y: number };
  whatIsIt: string;
  whyItMatters: string;
  fundusAppearance: string;
  howAiDetectsIt: string;
  limitations: string;
  aiPerspective: string;
}

export const RETINAL_ANATOMY_FEATURES: RetinalAnatomyFeature[] = [
  {
    id: 'blood-vessels',
    name: 'Blood vessels',
    category: 'Vascular',
    coordinates: { x: 52, y: 31 },
    whatIsIt:
      'The branching network of retinal arterioles and venules radiating from the optic nerve head across the inner retinal surface.',
    whyItMatters:
      'Vascular caliber, tortuosity, and branching symmetry provide essential structural context and reveal microvascular stress.',
    fundusAppearance:
      'Continuous dark-red (venules) and brighter-red (arterioles) branching tubes, often showing a subtle central specular light reflex.',
    howAiDetectsIt:
      'Convolutional filters sensitive to elongated tubular edges (especially in the green color channel) segment vessel trees and track caliber changes.',
    limitations:
      'Cataract haze, poor focus, or low illumination can fragment thin peripheral capillaries and confuse vessel-tracking layers.',
    aiPerspective:
      'In XAI models, vascular arcades serve as spatial coordinate anchors—helping the network distinguish normal vessel crossings from localized pathology.',
  },
  {
    id: 'optic-disc',
    name: 'Optic disc',
    category: 'Landmark',
    coordinates: { x: 74, y: 50 },
    whatIsIt:
      'The circular anatomical exit point where retinal ganglion cell axons converge into the optic nerve and central retinal vessels enter.',
    whyItMatters:
      'It defines nasal-temporal orientation and acts as a critical check site for neovascularization of the disc (NVD).',
    fundusAppearance:
      'A bright yellow-orange oval with a paler central physiological cup and crisp margins.',
    howAiDetectsIt:
      'High-luminance circular region detectors combined with radiating vessel convergence priors localize the disc center.',
    limitations:
      'Because the optic disc is naturally bright, naive saliency detectors can confuse it with large exudate clusters unless spatially contextualized.',
    aiPerspective:
      'Attention maps often highlight the disc border to verify anatomical orientation and inspect whether abnormal fine vessel loops cross the margin.',
  },
  {
    id: 'macula',
    name: 'Macula',
    category: 'Landmark',
    coordinates: { x: 46, y: 50 },
    whatIsIt:
      'The pigmented central retinal region surrounding the fovea responsible for sharp, high-acuity central vision.',
    whyItMatters:
      'Lesions or fluid-associated lipid deposits approaching the macula carry heightened clinical importance for vision preservation.',
    fundusAppearance:
      'A darker reddish-brown, avascular oval temporal to the optic disc, sometimes featuring a tiny central foveal pinpoint reflex.',
    howAiDetectsIt:
      'Relative spatial distance from the optic disc plus low vessel density and darker pigment gradient help CNNs localize the macular zone.',
    limitations:
      'Dark fundus pigmentation or uneven camera flash shading can mimic or obscure subtle macular boundary contrast.',
    aiPerspective:
      'Many explainable architectures weight features higher when they appear near the macular center compared with the far periphery.',
  },
  {
    id: 'microaneurysms',
    name: 'Microaneurysms',
    category: 'Lesion',
    coordinates: { x: 37, y: 38 },
    whatIsIt:
      'Tiny focal outpouchings (saccular dilations) of weakened retinal capillary walls, often among the earliest visible signs associated with diabetic retinopathy.',
    whyItMatters:
      'Their count and spatial spread help researchers differentiate early mild changes from normal baseline retinas.',
    fundusAppearance:
      'Small, sharply demarcated round red dots (typically 15–125 µm across) located beside fine capillary beds.',
    howAiDetectsIt:
      'High-resolution early convolutional layers detect small, high-contrast circular dark-red blobs in the green channel.',
    limitations:
      'Image compression artifacts, dust on camera lenses, or tiny pinpoint hemorrhages can look nearly identical at low resolution.',
    aiPerspective:
      'Because microaneurysms occupy only a few pixels, small resolution drops or JPEG blur dramatically raise model uncertainty.',
  },
  {
    id: 'hemorrhages',
    name: 'Hemorrhages',
    category: 'Lesion',
    coordinates: { x: 34, y: 63 },
    whatIsIt:
      'Localized blood leakage into the retinal layers from fragile or ruptured microvessels, taking dot, blot, or flame-like shapes.',
    whyItMatters:
      'The number of quadrants containing intraretinal hemorrhages is a key structural signal across moderate and severe grading rubrics.',
    fundusAppearance:
      'Darker red patches with irregular or round borders (dot/blot) or striated edges following nerve fibers (flame).',
    howAiDetectsIt:
      'Multi-scale texture and color-contrast filters capture dark-red non-tubular patches disconnected from continuous vessel trunks.',
    limitations:
      'Normal choroidal pigment mottling or intersecting dark veins can occasionally trigger false-positive saliency activations.',
    aiPerspective:
      'Grad-CAM heatmaps typically show strong concentrated peaks over clustered blot hemorrhages in moderate-to-severe patterns.',
  },
  {
    id: 'hard-exudates',
    name: 'Exudates',
    category: 'Lesion',
    coordinates: { x: 54, y: 57 },
    whatIsIt:
      'Lipid and protein deposits left behind when fluid leaks from damaged retinal capillaries into surrounding tissue.',
    whyItMatters:
      'Clusters forming rings or encroaching near the macula are closely monitored in diabetic eye research.',
    fundusAppearance:
      'Bright yellow-white waxy spots or clusters with crisp, well-defined edges.',
    howAiDetectsIt:
      'High-luminance yellow-channel contrast detectors flag sharp bright clusters that sit outside the optic disc.',
    limitations:
      'Drusen, myelinated nerve fibers, or bright camera lens reflections can share similar high-brightness color signatures.',
    aiPerspective:
      'Explainability overlays often respond strongly to hard exudates because of their high pixel contrast against the red retina.',
  },
  {
    id: 'cotton-wool-spots',
    name: 'Cotton-wool spots',
    category: 'Lesion',
    coordinates: { x: 56, y: 31 },
    whatIsIt:
      'Fluffy, pale patches representing localized micro-infarctions and swelling in the retinal nerve fiber layer due to focal ischemia.',
    whyItMatters:
      'They indicate localized microvascular non-perfusion and frequently accompany moderate-to-severe vascular stress.',
    fundusAppearance:
      'Ill-defined, cloud-like grayish-white patches with feathery edges, typically near major vascular arcades.',
    howAiDetectsIt:
      'Mid-level feature maps detect diffuse pale regions with soft gradients rather than sharp waxy borders.',
    limitations:
      'Flash glare or hazy media opacity can resemble diffuse pale patches, requiring contextual vessel comparison.',
    aiPerspective:
      'Soft-edge bright regions carry moderate attribution weights and often elevate uncertainty if image contrast is uneven.',
  },
  {
    id: 'neovascularization',
    name: 'Neovascularization',
    category: 'Lesion',
    coordinates: { x: 71, y: 46 },
    whatIsIt:
      'Abnormal growth of fragile, disorganized new blood vessels on the optic disc (NVD) or elsewhere on the retina (NVE) in response to widespread ischemia.',
    whyItMatters:
      'It marks the transition into proliferative-stage patterns that carry substantial risk of vitreous bleeding.',
    fundusAppearance:
      'Fine, lacy, tangled networks or loops of tiny vessels crossing normal vascular paths or sprouting near the disc margin.',
    howAiDetectsIt:
      'High-frequency directional filters and spatial attention heads look for dense, chaotic branching networks near the disc or arcades.',
    limitations:
      'Fine preretinal loops can fall out of focus if they grow slightly forward into the vitreous cavity, lowering detection reliability.',
    aiPerspective:
      'Models often spread probability between Severe and Proliferative classes when fine peripapillary vessel loops are subtle.',
  },
];

export const DR_GRADING_GUIDE = [
  {
    grade: 'No apparent DR',
    summary: 'No characteristic microvascular lesion patterns observed in the retinal field.',
    keyVisuals: 'Uniform vessel branching, clear macular gradient, crisp optic disc margin.',
    researchNote: 'Baseline reference state in screening classification datasets.',
  },
  {
    grade: 'Mild',
    summary: 'Minimal localized punctate capillary patterns only.',
    keyVisuals: 'Isolated microaneurysm-like dots without widespread hemorrhages or exudates.',
    researchNote: 'High sensitivity to image sharpness and resolution due to small lesion scale.',
  },
  {
    grade: 'Moderate',
    summary: 'More than isolated microaneurysm-like spots, yet below severe four-quadrant thresholds.',
    keyVisuals: 'Scattered dot/blot hemorrhages, small hard exudate specks, or occasional cotton-wool patches.',
    researchNote: 'Frequently shows moderate boundary uncertainty between Mild and Severe.',
  },
  {
    grade: 'Severe',
    summary: 'Extensive multi-quadrant microvascular abnormalities without clear neovascular proliferation.',
    keyVisuals: 'Numerous hemorrhages across quadrants, venous beading/tortuosity, or intraretinal microvascular irregularities.',
    researchNote: 'Models weigh multi-quadrant distribution alongside localized lesion density.',
  },
  {
    grade: 'Proliferative',
    summary: 'Patterns consistent with abnormal new vessel growth or preretinal hemorrhage.',
    keyVisuals: 'Fine tangled neovascular loops near the optic disc or along major vascular arcades.',
    researchNote: 'Highest clinical urgency in real ophthalmic workflows; requires specialist evaluation.',
  },
];

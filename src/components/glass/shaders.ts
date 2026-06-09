import { Skia, Shader, Canvas, Fill, Group, Paint, BlurMaskFilter, RuntimeShader, vec } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ============================================
// Gaussian Blur Shader (2-pass for performance)
// ============================================
export const blurShader = `
  uniform shader image;
  uniform float2 resolution;
  uniform float blurRadius;
  uniform int direction; // 0 = horizontal, 1 = vertical
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    float2 directionVec = direction == 0 ? float2(1.0, 0.0) : float2(0.0, 1.0);
    
    half4 color = half4(0.0);
    float totalWeight = 0.0;
    
    // Gaussian weights for kernel size 15
    float weights[8] = float[8](0.1995, 0.1762, 0.1210, 0.0648, 0.0270, 0.0088, 0.0022, 0.0004);
    
    for (int i = -7; i <= 7; i++) {
      float2 offset = directionVec * float(i) * blurRadius / resolution;
      float weight = weights[abs(i)];
      color += image.eval((uv + offset) * resolution) * weight;
      totalWeight += weight;
    }
    
    return color / totalWeight;
  }
`;

// ============================================
// Glass Panel Shader with Inner Glow
// ============================================
export const glassPanelShader = `
  uniform float2 resolution;
  uniform float cornerRadius;
  uniform float borderWidth;
  uniform float opacity;
  uniform float time;
  
  // Simplex noise function
  float3 mod289(float3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  float4 mod289(float4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  float4 permute(float4 x) { return mod289(((x*34.0)+1.0)*x); }
  float4 taylorInvSqrt(float4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(float3 v) {
    const float2 C = float2(1.0/6.0, 1.0/3.0);
    const float4 D = float4(0.0, 0.5, 1.0, 2.0);
    
    float3 i  = floor(v + dot(v, C.yyy));
    float3 x0 = v - i + dot(i, C.xxx);
    
    float3 g = step(x0.yzx, x0.xyz);
    float3 l = 1.0 - g;
    float3 i1 = min(g.xyz, l.zxy);
    float3 i2 = max(g.xyz, l.zxy);
    
    float3 x1 = x0 - i1 + C.xxx;
    float3 x2 = x0 - i2 + C.yyy;
    float3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    float4 p = permute(permute(permute(
              i.z + float4(0.0, i1.z, i2.z, 1.0))
            + i.y + float4(0.0, i1.y, i2.y, 1.0))
            + i.x + float4(0.0, i1.x, i2.x, 1.0));
            
    float n_ = 0.142857142857;
    float3 ns = n_ * D.wyz - D.xzx;
    
    float4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    float4 x_ = floor(j * ns.z);
    float4 y_ = floor(j - 7.0 * x_);
    
    float4 x = x_ *ns.x + ns.yyyy;
    float4 y = y_ *ns.x + ns.yyyy;
    float4 h = 1.0 - abs(x) - abs(y);
    
    float4 b0 = float4(x.xy, y.xy);
    float4 b1 = float4(x.zw, y.zw);
    
    float4 s0 = floor(b0)*2.0 + 1.0;
    float4 s1 = floor(b1)*2.0 + 1.0;
    float4 sh = -step(h, float4(0.0));
    
    float4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    float4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    float3 p0 = float3(a0.xy,h.x);
    float3 p1 = float3(a0.zw,h.y);
    float3 p2 = float3(a1.xy,h.z);
    float3 p3 = float3(a1.zw,h.w);
    
    float4 norm = taylorInvSqrt(float4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    float4 m = max(0.6 - float4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, float4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  // Rounded rectangle SDF
  float sdRoundedRect(float2 p, float2 b, float r) {
    float2 d = abs(p) - b + float2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
  }
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    float2 center = resolution * 0.5;
    float2 p = coord - center;
    float2 size = resolution * 0.5 - borderWidth;
    
    // Rounded rectangle distance
    float d = sdRoundedRect(p, size, cornerRadius);
    
    // Base glass color with opacity
    half4 baseColor = half4(1.0, 1.0, 1.0, opacity * 0.2);
    
    // Top highlight gradient
    float highlight = smoothstep(0.0, 0.3, uv.y) * 0.15;
    baseColor.rgb += highlight;
    
    // Bottom shadow
    float shadow = smoothstep(1.0, 0.7, uv.y) * 0.1;
    baseColor.rgb -= shadow;
    
    // Noise texture
    float noise = snoise(float3(coord * 0.01, time * 0.1)) * 0.03;
    baseColor.rgb += noise;
    
    // Border highlight
    float borderDist = abs(d);
    float borderGlow = smoothstep(borderWidth + 2.0, borderWidth, borderDist) * 0.4;
    baseColor.rgb += borderGlow;
    
    // Edge alpha
    float alpha = smoothstep(1.0, -1.0, d);
    baseColor.a *= alpha;
    
    return baseColor;
  }
`;

// ============================================
// Chromatic Aberration Shader
// ============================================
export const chromaticAberrationShader = `
  uniform shader image;
  uniform float2 resolution;
  uniform float intensity;
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    float2 center = float2(0.5, 0.5);
    float2 delta = uv - center;
    float dist = length(delta);
    float2 direction = normalize(delta);
    
    // RGB channel separation increases with distance from center
    float2 rOffset = uv + direction * intensity * dist * 0.02;
    float2 gOffset = uv;
    float2 bOffset = uv - direction * intensity * dist * 0.02;
    
    float r = image.eval(rOffset * resolution).r;
    float g = image.eval(gOffset * resolution).g;
    float b = image.eval(bOffset * resolution).b;
    float a = image.eval(uv * resolution).a;
    
    return half4(r, g, b, a);
  }
`;

// ============================================
// Start Orb Gradient Shader
// ============================================
export const startOrbShader = `
  uniform float2 resolution;
  uniform float time;
  uniform float hover; // 0.0 to 1.0
  uniform float press; // 0.0 to 1.0
  
  half4 main(float2 coord) {
    float2 center = resolution * 0.5;
    float2 p = coord - center;
    float dist = length(p);
    float maxDist = min(resolution.x, resolution.y) * 0.5;
    float normalizedDist = dist / maxDist;
    
    // Pulsing glow
    float pulse = sin(time * 2.0) * 0.1 + 0.9;
    float glowIntensity = (0.8 + hover * 0.3) * pulse;
    
    // Outer ring gradient (deep blue)
    half3 outerColor = half3(0.102, 0.227, 0.431);
    half3 innerColor = half3(0.180, 0.361, 0.620);
    
    // Center glow (cyan to white)
    half3 glowColor = half3(0.0, 0.831, 1.0);
    half3 centerColor = half3(1.0, 1.0, 1.0);
    
    // Mix colors based on distance
    half3 color = mix(outerColor, innerColor, smoothstep(0.6, 0.3, normalizedDist));
    color = mix(color, glowColor, smoothstep(0.4, 0.15, normalizedDist) * glowIntensity);
    color = mix(color, centerColor, smoothstep(0.25, 0.0, normalizedDist) * (0.9 + hover * 0.1));
    
    // Press effect (darker when pressed)
    color *= (1.0 - press * 0.2);
    
    // Soft outer edge
    float alpha = smoothstep(1.0, 0.85, normalizedDist);
    
    // Add hover ring
    float ringDist = abs(normalizedDist - (0.85 - hover * 0.05));
    float ring = smoothstep(0.05, 0.0, ringDist) * hover * 0.5;
    color += ring;
    
    return half4(color, alpha);
  }
`;

// ============================================
// Taskbar Reflection Shader
// ============================================
export const taskbarShader = `
  uniform float2 resolution;
  uniform float time;
  uniform float2 mousePos;
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    
    // Base glass color
    half4 baseColor = half4(0.95, 0.97, 1.0, 0.15);
    
    // Strong top highlight (Vista taskbar signature)
    float topHighlight = smoothstep(0.0, 0.15, uv.y) * 0.4;
    baseColor.rgb += topHighlight;
    
    // Subtle gradient fade to bottom
    float bottomFade = smoothstep(0.3, 1.0, uv.y) * 0.1;
    baseColor.rgb -= bottomFade;
    
    // Mouse interaction glow
    float2 mouseUV = mousePos / resolution;
    float mouseDist = length(uv - mouseUV);
    float mouseGlow = smoothstep(0.3, 0.0, mouseDist) * 0.15;
    baseColor.rgb += mouseGlow;
    
    // Subtle noise
    float noise = fract(sin(dot(coord, float2(12.9898, 78.233))) * 43758.5453);
    baseColor.rgb += (noise - 0.5) * 0.02;
    
    return baseColor;
  }
`;

// ============================================
// Window Button Shaders
// ============================================
export const windowButtonShader = `
  uniform float2 resolution;
  uniform int buttonType; // 0=minimize, 1=maximize, 2=close, 3=restore
  uniform float hover;
  uniform float active;
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    
    half4 baseColor;
    
    if (buttonType == 2) {
      // Close button - red glow on hover
      half3 redGlow = half3(0.91, 0.067, 0.137);
      half3 normalColor = half3(1.0, 1.0, 1.0);
      half3 color = mix(normalColor, redGlow, hover * 0.8);
      color = mix(color, redGlow * 0.7, active * 0.5);
      baseColor = half4(color, 0.1 + hover * 0.2);
    } else {
      // Minimize/maximize/restore - subtle glow
      half3 glowColor = half3(0.78, 0.86, 1.0);
      half3 color = mix(half3(1.0), glowColor, hover * 0.5);
      baseColor = half4(color, 0.05 + hover * 0.1);
    }
    
    // Top highlight for button
    float highlight = smoothstep(0.0, 0.3, uv.y) * (0.2 + hover * 0.3);
    baseColor.rgb += highlight;
    
    return baseColor;
  }
`;

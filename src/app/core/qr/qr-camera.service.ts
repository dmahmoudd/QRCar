import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { IScannerControls } from '@zxing/browser';

/**
 * Thin wrapper around ZXing so the scan page can start/stop the camera
 * without the library auto-requesting permission on construction.
 */
@Injectable({ providedIn: 'root' })
export class QrCameraService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private controls: IScannerControls | null = null;
  private video: HTMLVideoElement | null = null;

  isSupported(): boolean {
    return (
      this.isBrowser &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  async start(video: HTMLVideoElement, onText: (text: string) => void): Promise<void> {
    if (!this.isSupported()) {
      throw new DOMException('Camera is not available in this browser.', 'NotSupportedError');
    }

    await this.stop();
    this.video = video;

    const { BrowserQRCodeReader } = await import('@zxing/browser');
    const reader = new BrowserQRCodeReader();

    this.controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (result) {
        onText(result.getText());
      }
    });
  }

  async stop(): Promise<void> {
    this.controls?.stop();
    this.controls = null;
    this.releaseVideo();
  }

  private releaseVideo(): void {
    const video = this.video;
    this.video = null;

    if (!video) {
      return;
    }

    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    video.srcObject = null;
  }
}

import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

export interface NativeTtsPlugin {
  speak(options: { text: string }): Promise<void>;
  stop(): Promise<void>;
  setVoice(options: { voiceId: string }): Promise<void>;
  getVoices(): Promise<{ count: number }>;
  addListener(eventName: 'statusChanged', listenerFunc: (info: { status: string }) => void): any;
  addListener(eventName: 'speakingChanged', listenerFunc: (info: { isSpeaking: boolean }) => void): any;
}

const NativeTts = registerPlugin<NativeTtsPlugin>('NativeTts');

@Injectable({
  providedIn: 'root'
})
export class NativeTtsService {
  public isReady$ = new BehaviorSubject<boolean>(false);
  public isSpeaking$ = new BehaviorSubject<boolean>(false);
  public status$ = new BehaviorSubject<string>('NotLoaded');

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    NativeTts.addListener('statusChanged', (info) => {
      this.status$.next(info.status);
      if (info.status === 'Ready') {
        this.isReady$.next(true);
      }
    });

    NativeTts.addListener('speakingChanged', (info) => {
      this.isSpeaking$.next(info.isSpeaking);
    });
  }

  async speak(text: string) {
    await NativeTts.speak({ text });
  }

  async stop() {
    await NativeTts.stop();
  }

  async setVoice(voiceId: string) {
    await NativeTts.setVoice({ voiceId });
  }
}

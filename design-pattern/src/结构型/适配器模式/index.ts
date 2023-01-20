interface MediaPlayer {
  play(audioType: string, filename: string): void;
}

interface AdvanceMediaPlayer {
  playVlc(filename: string): void;
  playMp4(filename: string): void;
}

class VlcPlayer implements AdvanceMediaPlayer {
  playVlc(filename: string) {
    console.log('play vlc ' + filename);
  }

  playMp4() {}
}

class Mp4Player implements AdvanceMediaPlayer {
  playVlc() {}

  playMp4(filename: string) {
    console.log('play mp4 ' + filename);
  }
}

class MediaAdapter implements MediaPlayer {
  advancePlayer: AdvanceMediaPlayer;

  constructor(audioType: string) {
    if (audioType === 'vlc') {
      this.advancePlayer = new VlcPlayer();
    } else {
      this.advancePlayer = new Mp4Player();
    }
  }

  play(audioType: string, filename: string) {
    if (audioType === 'vlc') {
      this.advancePlayer.playVlc(filename);
    } else if (audioType === 'mp4') {
      this.advancePlayer.playMp4(filename);
    }
  }
}

class AudioPlayer implements MediaPlayer {
  // @ts-ignore
  mediaAdapter: MediaAdapter;

  play(audioType: string, filename: string) {
    if (audioType === 'mp3') {
      console.log('origin - mp3' + filename);
    } else if (audioType === 'vlc' || audioType === 'mp4') {
      this.mediaAdapter = new MediaAdapter(audioType);
      this.mediaAdapter.play(audioType, filename);
    } else {
      console.log('invalid media type' + filename);
    }
  }
}

(function () {
  const audioPlayer = new AudioPlayer();

  audioPlayer.play('mp3', 'gode.mp3');
  audioPlayer.play('mp4', 'adad2.mp4');
  audioPlayer.play('vlc', 'dccds.vlc');
  audioPlayer.play('flv', 'dccds.flv');
})();

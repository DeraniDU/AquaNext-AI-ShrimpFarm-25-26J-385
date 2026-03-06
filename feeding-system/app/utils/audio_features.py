import librosa
import numpy as np

SR = 48000
DUR = 5.0
WIN = int(SR * DUR)

N_MELS = 128
N_FFT = 2048
HOP = 512
TARGET_FRAMES = 469


def extract_mel(wav_path: str):
    y, sr = librosa.load(wav_path, sr=SR)

    # pad / trim to 5 seconds
    if len(y) < WIN:
        y = np.pad(y, (0, WIN - len(y)))
    y = y[:WIN]

    mel = librosa.feature.melspectrogram(
        y=y,
        sr=SR,
        n_fft=N_FFT,
        hop_length=HOP,
        n_mels=N_MELS,
        power=2.0
    )

    mel_db = librosa.power_to_db(mel, ref=np.max)

    # force time dimension
    mel_db = mel_db[:, :TARGET_FRAMES]
    if mel_db.shape[1] < TARGET_FRAMES:
        mel_db = np.pad(
            mel_db,
            ((0, 0), (0, TARGET_FRAMES - mel_db.shape[1])),
            mode="constant"
        )

    return mel_db.astype(np.float32)

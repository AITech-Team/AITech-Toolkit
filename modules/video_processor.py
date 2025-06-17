import os
import datetime
import logging
import numpy as np
import soundfile as sf
from pydub import AudioSegment
from pydub.effects import normalize
import noisereduce as nr
import whisper
import imageio

# 配置日志格式
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

def find_files(path: str, suffix: str) -> list[str]:
    """递归查找指定格式文件"""
    try:
        return [
            os.path.abspath(os.path.join(root, file))
            for root, _, files in os.walk(path)
            for file in files
            if file.lower().endswith(f'.{suffix.lower()}')
        ]
    except PermissionError:
        logging.error(f"没有权限访问路径: {path}")
        return []

def seconds_to_hmsm(seconds: float) -> str:
    """秒转时分秒毫秒格式（H:MM:SS,mmm）"""
    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = int((seconds - int(seconds)) * 1000)
    return f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d},{milliseconds:03d}"

def get_video_duration(file: str) -> str | None:
    """获取视频时长"""
    try:
        with imageio.get_reader(file) as video:
            duration = video.get_meta_data()['duration']
            return seconds_to_hmsm(duration)
    except Exception as e:
        logging.error(f"获取视频时长失败：{str(e)}")
        return None

def process_audio(
    input_file: str,
    output_file: str,
    target_sample_rate: int = 16000,
    max_segment_length: int = 300,
    noise_reduction_prop_decrease: float = 0.8,
    cancel_check_fn=None
):
    """处理音频文件：降噪、增强等"""
    try:
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        logging.info(f"开始处理音频文件: {input_file}")
        
        # 从视频中提取音频
        audio = AudioSegment.from_file(input_file)
        
        # 降低采样率以减少内存使用
        audio = audio.set_frame_rate(target_sample_rate)
        
        # 保存临时音频文件
        temp_wav_file = f"{base_name}_temp_audio.wav"
        audio.export(temp_wav_file, format="wav")
        
        # 分批处理长音频
        total_duration = len(audio) / 1000  # 音频总时长（秒）
        num_segments = int(np.ceil(total_duration / max_segment_length))
        
        processed_segments = []
        
        for i in range(num_segments):
            # 检查是否取消
            if cancel_check_fn and cancel_check_fn():
                logging.info("检测到取消请求，终止音频处理")
                # 清理临时文件
                if os.path.exists(temp_wav_file):
                    try:
                        os.remove(temp_wav_file)
                    except Exception as e:
                        logging.error(f"删除临时音频文件失败: {str(e)}")
                return
            
            start_time = i * max_segment_length
            end_time = min((i + 1) * max_segment_length, total_duration)
            
            logging.info(f"处理音频片段 {i + 1}/{num_segments} ({start_time:.1f}-{end_time:.1f}秒)")
            
            # 读取当前片段
            start_ms = int(start_time * 1000)
            end_ms = int(end_time * 1000)
            segment = audio[start_ms:end_ms]
            temp_segment_file = f"{base_name}_temp_segment_{i}.wav"
            segment.export(temp_segment_file, format="wav")
            
            # 加载片段进行降噪处理
            segment_data, segment_sr = sf.read(temp_segment_file)
            
            # 确保音频是单声道（减少内存使用）
            if len(segment_data.shape) > 1:
                logging.info(f"音频片段 {i + 1} 是多声道，转换为单声道")
                segment_data = np.mean(segment_data, axis=1)
            else:
                logging.info(f"音频片段 {i + 1} 是单声道")
            
            # 降噪处理
            try:
                reduced_noise = nr.reduce_noise(
                    y=segment_data,
                    sr=segment_sr,
                    stationary=True,
                    prop_decrease=noise_reduction_prop_decrease
                )
                logging.info(f"片段 {i + 1} 降噪成功")
            except Exception as e:
                logging.warning(f"片段 {i + 1} 降噪失败: {str(e)}，使用原始音频")
                reduced_noise = segment_data
            
            # 保存处理后的片段
            temp_processed_segment_file = f"{base_name}_temp_processed_segment_{i}.wav"
            sf.write(temp_processed_segment_file, reduced_noise, segment_sr)
            
            # 加载处理后的片段并添加到结果列表
            processed_segment = AudioSegment.from_wav(temp_processed_segment_file)
            processed_segments.append(processed_segment)
            
            # 清理临时文件
            try:
                os.remove(temp_segment_file)
                os.remove(temp_processed_segment_file)
            except Exception as e:
                logging.error(f"删除临时文件失败: {str(e)}")
        
        # 合并所有处理后的片段
        if processed_segments:
            processed_audio = processed_segments[0]
            for seg in processed_segments[1:]:
                processed_audio += seg
            
            # 人声增强：简单的归一化处理
            enhanced_audio = normalize(processed_audio)
            
            # 保存最终处理后的音频
            enhanced_audio.export(output_file, format="wav")
            logging.info(f"音频处理完成，已保存最终文件: {output_file}")
        else:
            logging.warning("警告：没有处理任何音频片段，使用原始音频")
            audio.export(output_file, format="wav")
            logging.info(f"未处理任何音频片段，已使用原始音频保存最终文件: {output_file}")
        
        # 删除临时音频文件
        if os.path.exists(temp_wav_file):
            try:
                os.remove(temp_wav_file)
            except Exception as e:
                logging.error(f"删除临时音频文件 {temp_wav_file} 失败: {str(e)}")
    
    except Exception as e:
        logging.error(f"音频处理失败：{str(e)}")
        import traceback
        traceback.print_exc()

def transcribe_single_video(
    file: str,
    model: whisper.Whisper,
    target_sample_rate: int,
    max_segment_length: int,
    noise_reduction_prop_decrease: float,
    output_dir: str,
    cancel_check_fn=None
):
    """处理单个视频的字幕生成"""
    base_name = os.path.splitext(os.path.basename(file))[0]
    srt_file = os.path.join(output_dir, f"{base_name}.srt")
    txt_file = os.path.join(output_dir, f"{base_name}.txt")
    
    # 记录开始时间
    process_start_time = datetime.datetime.now()
    file_name = os.path.relpath(file, start=os.path.dirname(file))
    
    try:
        logging.info(f"开始处理视频：{file_name}")
        duration = get_video_duration(file)
        if duration:
            logging.info(f"视频时长：{duration}")
        
        # 检查是否取消
        if cancel_check_fn and cancel_check_fn():
            logging.info("检测到取消请求，终止处理")
            return
        
        # 音频处理
        temp_wav = file[:-3] + "wav"
        process_audio(
            file, temp_wav, target_sample_rate, max_segment_length, 
            noise_reduction_prop_decrease, cancel_check_fn
        )
        
        # 检查是否取消
        if cancel_check_fn and cancel_check_fn():
            logging.info("检测到取消请求，终止处理")
            if os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except Exception as e:
                    logging.error(f"删除临时音频文件失败: {str(e)}")
            return
        
        # 检查临时音频文件是否存在且不为空
        if not os.path.exists(temp_wav) or os.path.getsize(temp_wav) == 0:
            logging.error(f"音频处理失败，临时音频文件为空或不存在：{temp_wav}")
            return
        
        # 语音转文字
        try:
            # 分段处理音频，以支持取消
            audio_input = whisper.load_audio(temp_wav)
            
            # 检查音频是否有效
            if len(audio_input) == 0:
                logging.error(f"音频文件为空或损坏：{temp_wav}")
                return
            
            audio_duration = len(audio_input) / whisper.audio.SAMPLE_RATE
            segment_duration = 30  # 每段30秒
            num_segments = int(np.ceil(audio_duration / segment_duration))
            
            all_segments = []
            for i in range(num_segments):
                # 检查是否取消
                if cancel_check_fn and cancel_check_fn():
                    logging.info("检测到取消请求，终止处理")
                    break
                
                segment_start_time = i * segment_duration
                segment_end_time = min((i + 1) * segment_duration, audio_duration)
                start_sample = int(segment_start_time * whisper.audio.SAMPLE_RATE)
                end_sample = int(segment_end_time * whisper.audio.SAMPLE_RATE)
                
                segment_audio = audio_input[start_sample:end_sample]
                
                # 检查音频段是否有效
                if len(segment_audio) == 0:
                    logging.warning(f"音频段 {i+1} 为空，跳过")
                    continue
                
                try:
                    result = model.transcribe(
                        segment_audio,
                        fp16=False  # 关闭混合精度
                    )
                    all_segments.extend(result["segments"])
                except Exception as segment_error:
                    logging.error(f"处理音频段 {i+1} 时出错: {str(segment_error)}")
                    continue
            
            # 如果处理被取消，直接返回
            if cancel_check_fn and cancel_check_fn():
                if os.path.exists(temp_wav):
                    try:
                        os.remove(temp_wav)
                    except Exception as e:
                        logging.error(f"删除临时音频文件失败: {str(e)}")
                return
        
        except Exception as e:
            logging.error(f"模型推理出错：{str(e)}")
            import traceback
            traceback.print_exc()
            return
        
        try:
            os.remove(temp_wav)
        except Exception as e:
            logging.error(f"删除临时音频文件 {temp_wav} 失败: {str(e)}")
        
        # 检查是否取消
        if cancel_check_fn and cancel_check_fn():
            logging.info("检测到取消请求，终止处理")
            return
        
        # 写入SRT文件
        with open(srt_file, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(all_segments, 1):
                start = seconds_to_hmsm(segment["start"])
                end = seconds_to_hmsm(segment["end"])
                text = segment["text"]
                f.write(f"{i}\n{start} --> {end}\n{text}\n\n")
        logging.info(f"字幕生成完成：{srt_file}")
        
        # 写入TXT文件
        with open(txt_file, 'w', encoding='utf-8') as f:
            for segment in all_segments:
                text = segment["text"]
                f.write(f"{text}\n")
        logging.info(f"纯文本文件生成完成：{txt_file}")
    
    except Exception as e:
        logging.error(f"处理失败：{str(e)}")
    finally:
        process_end_time = datetime.datetime.now()
        logging.info(f"处理耗时：{process_end_time - process_start_time}") 
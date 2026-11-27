/** Gôn's dialogue. Short, casual, cute Vietnamese. */
export const lines = {
  hello: ['Ủa, chào cậu nha!', 'Hế lô! Tui là Gôn nè.', 'Chọc tui hả? Hihi.', 'Ơ, có khách tới chơi!'],
  tickle: ['Ê, nhột quá à!', 'Thôi đừng chọc nữa mà!', 'Chọc nữa tui phun lửa đó!', 'Hứ, giận rồi nha!'],
  idle: [
    'Cậu còn đó hông?',
    'Xoa đầu tui đi, năn nỉ á…',
    'Thử bấm phím bất kỳ xem?',
    'Đói bụng rồi nè, cho tui ăn đi.',
    'Thả bóng ra chơi với tui hông?',
    'Thử lượn chuột vòng vòng quanh tui coi…',
  ],
  yawn: ['Oáp… buồn ngủ ghê.', 'Hoaaam… ai kể chuyện cổ tích đi.'],
  fed: ['Ngon quá trời luôn!', 'Măm măm! Thêm miếng nữa?', 'Ngon xỉu, cảm ơn cậu nha!', 'No căng bụng rồi nè.'],
  spicy: ['CAY QUÁAA! Nước, nước đâu!', 'Ớt gì mà cay xé lưỡi vậy nè!', 'Hà hà hà… phun lửa luôn rồi!'],
  pat: ['Hihi, thích ghê á…', 'Xoa nữa đi, sướng quá trời.', 'Ư… dễ chịu ghê.', 'Cậu là nhất luôn!'],
  ballOn: ['Bóng! Bóng kìa! Chơi với tui!', 'Yay, tới giờ chơi bóng!'],
  ballOff: ['Ơ… hết chơi rồi hả?', 'Cất bóng rồi, lần sau chơi tiếp nha.'],
  boop: ['Bụp!', 'Hụ hụ!', 'Đỡ nè!', 'Yeah!'],
  snackMiss: ['Ơ, rơi mất tiêu rồi…', 'Đưa gần miệng tui chút nữa nè!'],
  drag: ['Ơ ơ, đi đâu đây?', 'Thả tui xuống điii!', 'Ui, cao quá à!'],
  throw: ['Wheee!', 'Bay nèee!', 'Á á á!'],
  dizzy: ['Chóng mặt quá…', 'Trời đất quay cuồng…', 'Sao bay vòng vòng nè…'],
  weather: {
    sunny: ['Nắng đẹp quá, ra phơi nắng thôi!', 'Trời trong xanh ghê!'],
    rainy: ['Mưa rồi! May có cây dù vàng nè.', 'Tí tách tí tách… thích ghê.'],
    snowy: ['Tuyết rơi! Quàng khăn vô cho ấm nè.', 'Lạnh quá, hà hơi ra khói luôn!'],
    night: ['Sao lên rồi kìa… mí mắt nặng trĩu.', 'Đom đóm bay lung linh ghê…'],
  },
  gameExit: ['Về đảo rồi, nghỉ mệt xíu!', 'Chạy mỏi chân quá trời.'],
  gacha: ['Quay gacha hông? Hồi hộp ghê!', 'Coi tủ đồ của tui nè!'],
  gachaNew: ['Yay, đồ mới:', 'Woa, trúng rồi:'],
  gachaDuplicate: ['Trùng rồi… mà được hoàn xu nè!', 'Món này có rồi, lấy lại xu nha.'],
  gachaBroke: ['Hết xu rồi… chạy game kiếm thêm nha!', 'Ví trống trơn à, chơi game với tui đi!'],
  focusStart: ['Cố lên nha, tui ngồi học chung nè!', 'Tập trung nào! Tui đeo tai nghe rồi.'],
  focusDone: ['Xong một phiên rồi!', 'Tuyệt vời ông mặt trời!'],
  soundOn: ['Có tiếng rồi nè! Bloop!', 'Loa bật rồi, nghe tui nói nè.'],
  soundOff: ['Suỵt… im lặng là vàng.', 'Tắt tiếng rồi, tui nói thầm thôi.'],
  experiments: ['Mấy món tui đang vọc nè.', 'Phòng chơi nhỏ thôi, nhưng vui lắm.'],
  snacks: ['Đồ ăn! Kéo vô miệng tui nha!', 'Món nào cũng ngon hết á!'],
  welcomeBack: ['Ơ, về rồi hả! Nhớ ghê.', 'Đi đâu nãy giờ vậy?', 'Tui đợi nãy giờ đó nha.'],
  party: ['Quẩy lên nào!', 'Nhạc đâu, nhạc đâu!'],
  zeroG: ['Ơ… tui bay được nè!', 'Mất trọng lực rồi!'],
  clone: ['Tui có… sáu đứa em?!', 'Nhân bản thành công!'],
  pop: ['Hắt… hắt… XÌ! Ra tia lửa luôn.', 'Bùm! Tui vẫn nguyên con nha.', 'Rawr! Xin lỗi, tại nhột mũi.'],
  reset: ['Rồi, về như cũ.', 'Xong, ngăn nắp lại nha.'],
  sayHi: ['Nhắn tui đi, đừng ngại!', 'Ghé chơi nha, tui trả lời liền!'],
}

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Chào buổi sáng! Ăn sáng chưa nè?'
  if (hour >= 11 && hour < 13) return 'Trưa rồi, ăn cơm chưa đó?'
  if (hour >= 13 && hour < 18) return 'Chiều rồi, nghỉ tay chơi với tui xíu nha.'
  if (hour >= 18 && hour < 22) return 'Tối an lành! Vô đây chơi nè.'
  return 'Khuya lắm rồi, sao còn thức vậy?'
}

const lastPicked = new WeakMap<readonly string[], string>()

/** Pick a random line, avoiding the one picked last time from the same list. */
export function pick(list: readonly string[]): string {
  const prev = lastPicked.get(list)
  const pool = list.length > 1 ? list.filter((l) => l !== prev) : list
  const choice = pool[Math.floor(Math.random() * pool.length)]
  lastPicked.set(list, choice)
  return choice
}

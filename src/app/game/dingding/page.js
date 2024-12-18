'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Phaser 게임 컴포넌트
function GameComponent() {
  const [gameInstance, setGameInstance] = useState(null)

  useEffect(() => {
    // 이미 게임 인스턴스가 있다면 초기화하지 않음
    if (gameInstance) return;

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      
      // 기존 게임 캔버스가 있다면 제거
      const existingCanvas = document.querySelector('canvas');
      if (existingCanvas) {
        existingCanvas.remove();
      }
      
      const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        physics: {
          default: 'matter',
          matter: {
            gravity: { y: 0.5 },
            debug: false
          }
        },
        scene: {
          preload: preload,
          create: create,
          update: update
        },
        parent: 'phaser-game' // ID 변경
      }

      let bell
      let striker
      let timeText
      let scoreText
      let currentTime = 10
      let timerStarted = false
      let gameEnded = false
      let score = 0
      let timerEvent

      function preload() {
        this.load.image('bell', 'https://labs.phaser.io/assets/sprites/bell.png')
        this.load.image('striker', 'https://labs.phaser.io/assets/sprites/orb-red.png')
      }

      function create() {
        // 종 생성 - 검정색으로 변경
        bell = this.matter.add.image(400, 300, 'bell')
        bell.setStatic(true)
        bell.setScale(0.5)
        bell.setTint(0x000000)  // 검정색 틴트 추가

        // 종을 치는 striker 생성 - 검정색으로 변경
        striker = this.matter.add.image(400, 500, 'striker')  // 시작 위치를 아래쪽으로 변경
        striker.setScale(0.3)
        striker.setBounce(0.8)
        striker.setInteractive({ draggable: true })  // 드래그 가능하도록 설정
        striker.setTint(0x000000)
        
        // 드래그 시작점 저장용 변수
        let dragStartPosition = null
        
        // 드래그 시작
        this.input.on('dragstart', (pointer, gameObject) => {
          if (gameObject === striker) {
            dragStartPosition = { x: striker.x, y: striker.y }
            striker.setStatic(true)  // 드래그 중에는 정적으로 설정
          }
        })

        // 드래그 중
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
          if (gameObject === striker) {
            // 드래그 거리 제한
            const maxDragDistance = 150
            const dx = dragX - dragStartPosition.x
            const dy = dragY - dragStartPosition.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance > maxDragDistance) {
              const angle = Math.atan2(dy, dx)
              dragX = dragStartPosition.x + Math.cos(angle) * maxDragDistance
              dragY = dragStartPosition.y + Math.sin(angle) * maxDragDistance
            }
            
            // 드래그 방향 제한 (위쪽으로만)
            if (dragY > dragStartPosition.y) {
              dragY = dragStartPosition.y
            }
            
            striker.setPosition(dragX, dragY)
            
            // 시각적 피드백을 위한 라인 그리기 (있다면 기존 라인 삭제)
            if (this.dragLine) this.dragLine.destroy()
            this.dragLine = this.add.line(
              0, 0,
              dragStartPosition.x, dragStartPosition.y,
              striker.x, striker.y,
              0x000000
            ).setOrigin(0, 0)
          }
        })

        // 드래그 종료
        this.input.on('dragend', (pointer, gameObject) => {
          if (gameObject === striker) {
            striker.setStatic(false)  // 물리 효과 다시 활성화
            
            // 당긴 거리에 비례하여 힘 계산
            const dx = dragStartPosition.x - striker.x
            const dy = dragStartPosition.y - striker.y
            const force = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.1, 15)
            
            // 반대 방향으로 힘 적용
            striker.setVelocity(dx * force, dy * force)
            
            // 라인 제거
            if (this.dragLine) {
              this.dragLine.destroy()
              this.dragLine = null
            }
            
            dragStartPosition = null
          }
        })

        // 시간 텍스트 - 검정색으로 변경
        timeText = this.add.text(16, 16, '시간: 10.00', {
          fontSize: '32px',
          fill: '#000'  // 검정색으로 변경
        })

        // 점수 텍스트 - 검정색으로 변경
        scoreText = this.add.text(16, 56, '점수: 0', {
          fontSize: '32px',
          fill: '#000'  // 검정색으로 변경
        })

        // 게임 시작 버튼 - 검정색으로 변경
        const startButton = this.add.text(400, 500, '게임 시작', {
          fontSize: '32px',
          fill: '#000'  // 검정색으로 변경
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', startGame.bind(this))

        // 충돌 감지
        this.matter.world.on('collisionstart', (event) => {
          const pairs = event.pairs
          pairs.forEach((pair) => {
            if ((pair.bodyA === bell.body || pair.bodyB === bell.body) &&
                (pair.bodyA === striker.body || pair.bodyB === striker.body)) {
              handleBellHit()
            }
          })
        })
      }

      function update() {
        // striker가 화면 아래로 벗어나면 원위치
        if (striker.y > 800 || striker.x < 0 || striker.x > 800) {
          resetStriker()
        }
      }

      // striker 리셋 함수
      function resetStriker() {
        striker.setPosition(400, 500)  // 초기 위치로
        striker.setVelocity(0, 0)     // 속도 초기화
        striker.setAngularVelocity(0)  // 회전 속도 초기화
      }

      function startGame() {
        currentTime = 10
        timerStarted = true
        gameEnded = false
        score = 0

        timerEvent = this.time.addEvent({
          delay: 100,  // 100ms마다 업데이트
          callback: updateTimer,
          callbackScope: this,
          loop: true
        })
      }

      function updateTimer() {
        if (currentTime > 0) {
          currentTime -= 0.1
          currentTime = Math.round(currentTime * 100) / 100  // 소수점 2자리까지

          if (currentTime <= 5) {
            timeText.setText('???')  // 5초 이하부터는 시간을 숨김
          } else {
            timeText.setText(`시간: ${currentTime.toFixed(2)}`)
          }
        } else {
          timerEvent.remove()
          gameEnded = true
        }
      }

      function handleBellHit() {
        if (timerStarted && !gameEnded) {
          const timeDiff = Math.abs(currentTime)
          const maxScore = 10000
          score = Math.max(0, maxScore - (timeDiff * 1000))  // 차이가 적을수록 높은 점수
          
          scoreText.setText(`점수: ${Math.round(score)}`)
          timerEvent.remove()
          gameEnded = true
        }
      }

      // 게임 인스턴스 생�� 및 저장
      const game = new Phaser.Game(config)
      setGameInstance(game)
    }

    initPhaser()

    // 클린업 함수
    return () => {
      if (gameInstance) {
        gameInstance.destroy(true)
        setGameInstance(null)
      }
    }
  }, [gameInstance]) // gameInstance를 의존성 배열에 추가

  return (
    <div id="phaser-game" /> // ID 변경
  )
}

// SSR을 비활성화한 게임 컴포넌트
const DingDingGameComponent = dynamic(() => Promise.resolve(GameComponent), {
  ssr: false
})

// 메인 컴포넌트
export default function DingDingGame() {
  return (
    <div className="game-wrapper">
      <DingDingGameComponent />
    </div>
  )
}

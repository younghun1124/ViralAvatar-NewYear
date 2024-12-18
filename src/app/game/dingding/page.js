'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Phaser 게임 컴포넌트
function GameComponent() {
  const [gameInstance, setGameInstance] = useState(null)

  useEffect(() => {
    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      
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
        parent: 'game-container' // 게임이 렌더링될 div의 ID
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
        striker = this.matter.add.image(400, 100, 'striker')
        striker.setScale(0.3)
        striker.setBounce(0.8)
        striker.setInteractive()
        striker.setTint(0x000000)  // 검정색 틴트 추가

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
        // striker를 마우스 위치로 이동
        if (!gameEnded) {
          striker.setPosition(this.input.x, this.input.y)
        }
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

      // 게임 인스턴스 생성 및 저장
      const game = new Phaser.Game(config)
      setGameInstance(game)
    }

    initPhaser()

    // 클린업 함수
    return () => {
      if (gameInstance) {
        gameInstance.destroy(true)
      }
    }
  }, []) // 빈 의존성 배열

  return (
    <div id="game-container" />
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

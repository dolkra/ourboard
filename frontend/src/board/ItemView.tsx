import * as H from "harmaja";
import { componentScope, h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Id, Note, ItemLocks, Item, Text, ItemType } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu } from "./ContextMenuView"
import { SelectionBorder } from "./SelectionBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection";
import { Dispatch } from "./board-store";

export const ItemView = (
    { board, id, type, item, locks, userId, focus, coordinateHelper, dispatch, contextMenu }:
    {  
        board: L.Property<Board>, id: string; type: string, item: L.Property<Item>,
        locks: L.Property<ItemLocks>,
        userId: L.Property<Id | null>,
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch,
        contextMenu: L.Atom<ContextMenu>
    }
) => {
  const element = L.atom<HTMLElement | null>(null)
  const ref = (el: HTMLElement) => {
     itemDragToMove(id, board, focus, coordinateHelper, dispatch)(el)
     element.set(el)
  }



  const { itemFocus, selected, onClick } = itemSelectionHandler(id, focus, contextMenu, board, userId, locks, dispatch)

  function onContextMenu(e: JSX.MouseEvent) {
    onClick(e)
    const { x, y } = coordinateHelper.currentClientCoordinates.get()
    contextMenu.set({ hidden: false, x: x, y: y})
    e.preventDefault()
  }

  const dataTest = L.combineTemplate({
    text: L.view(item, i => i.type === "note" ? i.text : ""),
    type: L.view(item, "type"),
    selected
  }).pipe(L.map(({ text, selected, type }: { text: string, selected: boolean, type: ItemType }) => {
    const textSuffix = text ? "-" + text : ""
    return selected ? `${type}-selected${textSuffix}` : `${type}${textSuffix}`
  }))


  return (
    <span
      ref={ref}
      data-test={dataTest}
      draggable={true}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={L.view(selected, s => s ? type + " selected" : type)}
      style={item.pipe(L.map((p: Item) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: p.height + "em",
        width: p.width + "em",
        background: p.type === "note" ? p.color : "none",
        position: "absolute"        
      })))}      
    >
      { (type === "note" || type === "text") ? <TextView item={item as L.Property<Note | Text>}/> : null }
      { L.view(locks, l => l[id] && l[id] !== userId.get() ? <span className="lock">🔒</span> : null )}
      { L.view(selected, s => s ? <SelectionBorder {...{ id, item: item, coordinateHelper, board, focus, dispatch}}/> : null) }
    </span>
  );

  function TextView({ item } : { item: L.Property<Note | Text>} ) {
    const textAtom = L.atom(L.view(item, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, item: { ...item.get(), text } }))
    const showCoords = false
    const textElement = L.atom<HTMLElement | null>(null)
  
    const fontSize = L.view(item, element, textElement, (i: Item, el: HTMLElement | null, textEl: HTMLElement | null) => {
      if (el && textEl) {
        // TODO: not stable. Would make sense to calculate font while editing and then store it in the model to make it consistent. 
        const [_, n, unit] = getComputedStyle(textEl).getPropertyValue('font-size').match(/([\d\.]*)(.*)/)        
        const currentFontSize = parseFloat(n)
        const textWidth = textEl.getBoundingClientRect().width
        const elementWidth = el.getBoundingClientRect().width
        const textHeight = textEl.getBoundingClientRect().height
        const elementHeight = el.getBoundingClientRect().width
        const fontSize = (Math.min(currentFontSize * elementWidth / textWidth, currentFontSize * elementHeight / textHeight) * 0.8).toFixed(2)
        console.log(`${textAtom.get()} current ${currentFontSize}, target ${fontSize}, width ${textWidth}/${elementWidth}, height ${textHeight}/${elementHeight}`)
        return fontSize + unit
      }
      return "1em"
    })

    const setEditingIfAllowed = (e: boolean) => {
      const l = locks.get()
      const u = userId.get()
  
      if (!u) return
      if (l[id] && l[id] !== u) return
      focus.set(e ? { status: "editing", id } : { status: "selected", ids: new Set([id]) })
  
      !l[id] && dispatch({ action: "item.lock", boardId: board.get().id, itemId: id })
    }
  
    return <span className="text" ref={(e : HTMLElement) => setTimeout(() => textElement.set(e), 0)} style={ L.combineTemplate({fontSize}) }>
      <EditableSpan {...{
        value: textAtom, editingThis: L.atom(
            L.view(itemFocus, f => f === "editing"),
            setEditingIfAllowed
        )
      }} />
      { showCoords ? <small>{L.view(item, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small> : null}
    </span>
  }
};